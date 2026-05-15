/* ═══════════════════════════════════════════════════════
   DARKROOM GALLERY v2
   David Langarica philosophy: Minimal, immersive, smooth scroll
   Implementation: Clean 3D darkroom walk-through with:
   - Hardcopy photo textures (grain, paper, aged look)
   - Realistic water shader (refraction + ripples)
   - Warm amber/red safelights (not neon)
   - Only category labels (no description text)
   - Smooth camera splines through 4 zones
════════════════════════════════════════════════════════ */

/* ── SHADER: Hardcopy Photo Texture ── */
const HARDCOPY_SHADER = {
  uniforms: {
    uTexture: { value: null },
    uGrainScale: { value: 2.0 },
    uGrainAmount: { value: 0.15 },
    uPaperTint: { value: new THREE.Color(0xf5e8d8) },
    uTime: { value: 0 },
    uEdgeWear: { value: 0.12 },
    uCornerDarkness: { value: 0.08 }
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D uTexture;
    uniform float uGrainScale;
    uniform float uGrainAmount;
    uniform vec3 uPaperTint;
    uniform float uTime;
    uniform float uEdgeWear;
    uniform float uCornerDarkness;
    varying vec2 vUv;
    
    float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
    float grain(vec2 uv) {
      return mix(
        hash(uv * uGrainScale),
        hash(uv * uGrainScale + vec2(sin(uTime * 0.01), cos(uTime * 0.02))),
        0.5
      );
    }
    
    void main() {
      vec2 uv = vUv;
      vec4 texColor = texture2D(uTexture, uv);
      
      // Grain/film texture
      float gr = grain(uv * 1000.0);
      float grainMask = mix(0.95, 1.05, gr);
      
      // Paper tint overlay
      vec3 color = mix(texColor.rgb, uPaperTint, 0.08);
      color *= grainMask;
      
      // Slight yellowing at edges (aged paper)
      float edgeFade = length(uv - 0.5) * 1.4;
      color = mix(color, mix(color, uPaperTint * 0.85, 0.15), edgeFade * uEdgeWear);
      
      // Corner darkening (vignette)
      vec2 corner = abs(uv - 0.5);
      float cornerVig = smoothstep(0.0, 0.5, 1.0 - (corner.x + corner.y));
      color *= mix(1.0, cornerVig, uCornerDarkness);
      
      // Subtle scratches (photographic wear)
      float scratch = sin(uv.y * 180.0 + sin(uv.x * 50.0)) * 0.5 + 0.5;
      color = mix(color, color * 0.98, scratch * 0.02);
      
      gl_FragColor = vec4(color, texColor.a);
    }
  `
};

/* ── SHADER: Realistic Water ── */
const WATER_SHADER = {
  uniforms: {
    uTexture: { value: null },
    uTime: { value: 0 },
    uWaveScale: { value: 0.8 },
    uWaveFreq: { value: 2.0 },
    uRefractStrength: { value: 0.04 },
    uAlphaStrength: { value: 0.35 },
    uWaterColor: { value: new THREE.Color(0x0a2829) }
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D uTexture;
    uniform float uTime;
    uniform float uWaveScale;
    uniform float uWaveFreq;
    uniform float uRefractStrength;
    uniform float uAlphaStrength;
    uniform vec3 uWaterColor;
    varying vec2 vUv;
    
    float sine(float t) { return sin(t * 6.283185); }
    float wave(vec2 uv, float t) {
      float w1 = sine(uv.x * uWaveFreq + t) * uWaveScale;
      float w2 = sine(uv.y * uWaveFreq * 0.7 + t * 1.3) * uWaveScale * 0.7;
      float w3 = sine((uv.x + uv.y) * uWaveFreq * 0.5 + t * 0.9) * uWaveScale * 0.5;
      return (w1 + w2 + w3) / 3.0;
    }
    
    void main() {
      vec2 uv = vUv;
      
      // Animated wave distortion
      float waveDisplaceX = wave(uv, uTime * 0.5) * uRefractStrength;
      float waveDisplaceY = wave(uv + vec2(2.0), uTime * 0.5) * uRefractStrength;
      
      vec2 refractUv = uv + vec2(waveDisplaceX, waveDisplaceY);
      
      // Sample with refraction
      vec4 texColor = texture2D(uTexture, refractUv);
      
      // Water color overlay (deep amber-tinged water)
      vec3 color = mix(texColor.rgb, uWaterColor, 0.25);
      
      // Ripple brightness variation
      float ripple = sine(length(uv - 0.5) * 10.0 - uTime) * 0.5 + 0.5;
      color *= mix(0.95, 1.05, ripple * 0.2);
      
      // Fresnel effect (stronger at edges)
      float fresnel = length(uv - 0.5) * 0.8;
      fresnel = smoothstep(0.0, 1.0, fresnel);
      color = mix(color, vec3(0.3, 0.4, 0.4), fresnel * 0.15);
      
      gl_FragColor = vec4(color, uAlphaStrength);
    }
  `
};

/* ── Global State ── */
let drScene, drCamera, drRenderer, drComposer;
let drInited = false, drAssetsLoaded = false, isDarkroomOpen = false;
let drTextureLoader;
let drAnimFrame = null;

// Scroll + camera state
let drScrollT = 0, drRenderT = 0;
let drParallaxX = 0, drParallaxY = 0;
let drTargetParaX = 0, drTargetParaY = 0;
let currentZoneIdx = 0;
let drSplinePos, drSplineLook;

// Photo meshes + hover
let drPhotoMeshes = [];
let drHovered = null;
let drRaycaster, drMouse;

// Viewer
let drViewerZone = null, drViewerIdx = 0;

/* ── Gallery Data (Minimal — Only Category Labels) ── */
const ZONES = {
  enlarger: {
    label: 'LENS // VISIONEXPRESS',
    cameraPos: [0, 1.0, 3.8],
    cameraLook: [0, -0.4, -2.0],
    images: [
      'images/product-visionexpress-frames-sunclip-flatlay-1.webp',
      'images/product-visionexpress-frames-lens-macro-detail-2.webp',
      'images/product-visionexpress-frames-front-face-studio-3.webp',
      'images/product-visionexpress-frames-temple-side-profile-4.webp',
      'images/product-visionexpress-frames-sunclip-3quarter-5.webp',
    ]
  },
  developing: {
    label: 'VESSEL // MACCLITE',
    cameraPos: [-3.0, 0.8, 3.2],
    cameraLook: [-3.0, -1.8, -1.5],
    images: [
      'images/product-macclite-wok-overhead-blue-studio-1.webp',
      'images/product-macclite-wok-angled-dramatic-studio-2.webp',
      'images/product-macclite-crepe-pan-side-profile-studio-3.webp',
      'images/product-macclite-tawa-frontal-studio-4.webp',
      'images/product-macclite-pan-handle-macro-detail-5.webp',
      'images/product-macclite-pan-kitchen-counter-lifestyle-6.webp',
    ]
  },
  wash: {
    label: 'WOVEN // NATURAL FIBRE',
    cameraPos: [3.5, 1.0, 3.0],
    cameraLook: [3.2, -1.8, -1.5],
    images: [
      'images/product-woven-basket-forest-editorial-bangalore-1.webp',
      'images/product-woven-basket-bougainvillea-lifestyle-bangalore-2.webp',
      'images/product-woven-tote-basket-dried-flowers-studio-3.webp',
      'images/product-woven-basket-overhead-citrus-4.webp',
      'images/product-woven-crossbody-bag-spotlight-studio-5.webp',
      'images/product-woven-open-basket-lifestyle-bangalore-6.webp',
    ]
  },
  wall: {
    label: 'SOLE // LP SNEAKERS',
    cameraPos: [0, 1.0, 2.0],
    cameraLook: [0, 1.2, -6.5],
    images: [
      'images/product-louis-philippe-sneaker-side-profile-studio-1.webp',
      'images/product-louis-philippe-sneaker-sole-detail-studio-2.webp',
      'images/product-louis-philippe-sneaker-heel-suede-detail-3.webp',
      'images/product-louis-philippe-sneaker-toe-logo-macro-4.webp',
      'images/product-louis-philippe-sneaker-sole-bottom-studio-5.webp',
      'images/product-louis-philippe-sneaker-pair-front-angle-6.webp',
      'images/product-louis-philippe-sneaker-pair-top-overhead-7.webp',
      'images/product-louis-philippe-sneaker-pair-rear-angle-8.webp',
    ]
  }
};

const ZONE_ORDER = ['enlarger', 'developing', 'wash', 'wall'];

const FLOOR_Y = -3.5;
const TABLE_H = 1.2;
const TABLE_TOP = FLOOR_Y + TABLE_H;

/* ── Initialize Three.js ── */
function initDarkroom() {
  if (!window.THREE || drInited) return;
  drInited = true;

  const canvas = document.getElementById('darkroom-canvas');
  drRenderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  drRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  drRenderer.setSize(window.innerWidth, window.innerHeight);
  drRenderer.setClearColor(0x030100, 1);
  drRenderer.toneMapping = THREE.ACESFilmicToneMapping;
  drRenderer.toneMappingExposure = 1.25;
  drRenderer.shadowMap.enabled = true;
  drRenderer.shadowMap.type = THREE.PCFSoftShadowMap;

  drScene = new THREE.Scene();
  drScene.fog = new THREE.FogExp2(0x140601, 0.035);

  drCamera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.05, 100);

  drRaycaster = new THREE.Raycaster();
  drMouse = new THREE.Vector2(-10, -10);

  drTextureLoader = new THREE.TextureLoader();

  buildCameraSplines();
  buildRoom();

  // Post-processing
  drComposer = new THREE.EffectComposer(drRenderer);
  drComposer.addPass(new THREE.RenderPass(drScene, drCamera));
  const bloom = new THREE.UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    0.8, 0.6, 0.7
  );
  drComposer.addPass(bloom);
  const film = new THREE.FilmPass(0.15, 0.03, 640, false);
  drComposer.addPass(film);

  window.addEventListener('resize', onDrResize);
}

/* ── Camera Splines ── */
function buildCameraSplines() {
  const positions = ZONE_ORDER.map(z => new THREE.Vector3(...ZONES[z].cameraPos));
  const lookAts = ZONE_ORDER.map(z => new THREE.Vector3(...ZONES[z].cameraLook));

  const pPts = [positions[0].clone(), ...positions, positions[positions.length - 1].clone()];
  const lPts = [lookAts[0].clone(), ...lookAts, lookAts[lookAts.length - 1].clone()];

  drSplinePos = new THREE.CatmullRomCurve3(pPts, false, 'catmullrom', 0.45);
  drSplineLook = new THREE.CatmullRomCurve3(lPts, false, 'catmullrom', 0.45);
}

function scrollTtoSplineT(scrollT) {
  const n = ZONE_ORDER.length;
  const zoneF = scrollT * (n - 1);
  const lo = Math.max(0, Math.min(n - 2, Math.floor(zoneF)));
  const frac = zoneF - lo;
  const t0 = (lo + 1) / (n + 1);
  const t1 = (lo + 2) / (n + 1);
  return t0 + (t1 - t0) * frac;
}

/* ── Build Room Geometry + Lighting ── */
function buildRoom() {
  const wallMat = new THREE.MeshStandardMaterial({ color: 0x0a0402, roughness: 0.97, metalness: 0.0 });
  const floorMat = new THREE.MeshStandardMaterial({ color: 0x050101, roughness: 0.99, metalness: 0.0 });

  // Walls
  [
    [0, 0, -8.5, new THREE.Vector3(0, 0, 0), new THREE.Vector3(35, 15, 0)],
    [-11, 0, 0, new THREE.Vector3(0, 0, Math.PI / 2), new THREE.Vector3(22, 15, 0)],
    [11, 0, 0, new THREE.Vector3(0, Math.PI / 2, 0), new THREE.Vector3(22, 15, 0)],
  ].forEach(([x, y, z, rot, size]) => {
    const w = new THREE.Mesh(new THREE.PlaneGeometry(size.x, size.y), wallMat);
    w.position.set(x, y, z);
    w.rotation.copy(rot);
    w.receiveShadow = true;
    drScene.add(w);
  });

  // Ceiling + Floor
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(35, 22), wallMat);
  ceil.rotation.x = Math.PI / 2;
  ceil.position.y = 6.2;
  drScene.add(ceil);

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(35, 26), floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = FLOOR_Y;
  floor.receiveShadow = true;
  drScene.add(floor);

  /* ── SAFELIGHT SYSTEM (warm amber/red) ── */
  const safeLights = [
    { pos: [0, 5.2, -0.5], power: 15.0, range: 32, decay: 1.5, color: 0xff3000 },
    { pos: [-3.2, 4.9, -0.8], power: 9.0, range: 22, decay: 1.8, color: 0xff2000 },
    { pos: [3.5, 4.9, -0.8], power: 7.0, range: 20, decay: 1.9, color: 0xff1500 },
  ];

  safeLights.forEach(({ pos, power, range, decay, color }) => {
    const light = new THREE.PointLight(color, power, range, decay);
    light.position.set(...pos);
    light.castShadow = true;
    light.shadow.mapSize.set(512, 512);
    drScene.add(light);
  });

  // Ambient warm fill
  drScene.add(new THREE.AmbientLight(0x200500, 2.8));

  // Back wall glow
  const backGlow = new THREE.PointLight(0xff5510, 4.0, 16, 1.8);
  backGlow.position.set(0, 2.8, -7.8);
  drScene.add(backGlow);

  // Enlarger beam (warm white)
  const beam = new THREE.SpotLight(0xffffd0, 50, 8, Math.PI / 8, 0.16, 1.5);
  beam.position.set(0, 2.0, -2.2);
  beam.target.position.set(0, -3.5, -2.2);
  beam.castShadow = true;
  beam.shadow.mapSize.set(512, 512);
  drScene.add(beam);
  drScene.add(beam.target);

  // Tray glows
  const basinGlow = new THREE.PointLight(0xff4000, 3.8, 9, 2.0);
  basinGlow.position.set(-3.2, -2.0, -1.5);
  drScene.add(basinGlow);

  const washGlow = new THREE.PointLight(0xff2200, 3.0, 8, 2.1);
  washGlow.position.set(3.5, -2.0, -1.5);
  drScene.add(washGlow);

  // Rim light
  const rim = new THREE.PointLight(0xff1400, 1.5, 16, 2.0);
  rim.position.set(-10, 1.5, -2);
  drScene.add(rim);

  placeSceneObjects();
}

/* ── Place Scene Objects ── */
function placeSceneObjects() {
  // Zone 0: Enlarger table
  addTable(0, FLOOR_Y, -2.2);
  addEnlarger(0, TABLE_TOP, -3.2);
  addBottle(-0.5, TABLE_TOP, -1.8, 0.18);
  addFunnel(-0.7, TABLE_TOP, -1.5, 0.13);
  buildEnlargerPhotos();

  // Zone 1: Developing trays
  addTable(-3.2, FLOOR_Y, -2.2);
  [-4.0, -3.2, -2.4].forEach(x => addTray(x, TABLE_TOP, -2.0));
  addThermometer(-4.0, TABLE_TOP + 0.11, -1.95);
  buildDevelopingPhotos();

  // Zone 2: Wash trays
  addTable(3.5, FLOOR_Y, -2.2);
  addTray(3.0, TABLE_TOP, -2.2, 0.48);
  addTray(4.0, TABLE_TOP, -2.2, 0.44);
  addBottle(4.9, TABLE_TOP, -1.8, 0.27);
  addFunnel(5.0, TABLE_TOP + 0.15, -1.8, 0.14);
  buildWashPhotos();

  // Zone 3: Wall
  buildWallPhotos();
  addWallBoard();
  addCabinetShelf(-8.0, FLOOR_Y + 0.85, -4.2);
  [-6.5, -7.0, -7.5].forEach(x => addBottle(x, 1.15, -4.2, 0.28));
}

/* ── Simple 3D Objects (Procedural) ── */

function addTable(x, y, z, w = 1.8, h = TABLE_H, d = 1.0) {
  const top = new THREE.Mesh(
    new THREE.BoxGeometry(w, 0.08, d),
    new THREE.MeshStandardMaterial({ color: 0x3a2416, roughness: 0.85, metalness: 0.1 })
  );
  top.position.set(x, y + h, z);
  top.castShadow = top.receiveShadow = true;
  drScene.add(top);

  const legs = new THREE.Mesh(
    new THREE.BoxGeometry(0.12, h - 0.08, 0.12),
    new THREE.MeshStandardMaterial({ color: 0x2a1808, roughness: 0.9, metalness: 0.0 })
  );
  legs.position.set(x, y + h / 2, z);
  legs.castShadow = legs.receiveShadow = true;
  drScene.add(legs);
}

function addEnlarger(x, y, z) {
  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(0.14, 0.16, 1.3, 8),
    new THREE.MeshStandardMaterial({ color: 0x1a1108, roughness: 0.6, metalness: 0.5 })
  );
  body.position.set(x, y + 0.65, z);
  body.castShadow = body.receiveShadow = true;
  drScene.add(body);

  const head = new THREE.Mesh(
    new THREE.CylinderGeometry(0.22, 0.20, 0.15, 8),
    new THREE.MeshStandardMaterial({ color: 0x0f0a06, roughness: 0.7, metalness: 0.4 })
  );
  head.position.set(x, y + 1.35, z);
  head.castShadow = head.receiveShadow = true;
  drScene.add(head);

  const lens = new THREE.Mesh(
    new THREE.CylinderGeometry(0.10, 0.10, 0.06, 16),
    new THREE.MeshStandardMaterial({ color: 0x0a0a0a, roughness: 0.4, metalness: 0.8 })
  );
  lens.position.set(x, y + 1.46, z - 0.15);
  lens.rotation.z = Math.PI / 2;
  drScene.add(lens);
}

function addTray(x, y, z, h = 0.36) {
  const tray = new THREE.Mesh(
    new THREE.BoxGeometry(0.45, 0.08, 0.35),
    new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.8, metalness: 0.2 })
  );
  tray.position.set(x, y, z);
  tray.castShadow = tray.receiveShadow = true;
  drScene.add(tray);

  // Water interior with shader
  const waterMat = new THREE.ShaderMaterial({
    uniforms: {
      ...WATER_SHADER.uniforms,
      uTexture: { value: null }
    },
    vertexShader: WATER_SHADER.vertexShader,
    fragmentShader: WATER_SHADER.fragmentShader,
    side: THREE.DoubleSide,
    transparent: true,
    blending: THREE.NormalBlending,
  });

  const water = new THREE.Mesh(
    new THREE.PlaneGeometry(0.42, 0.32),
    waterMat
  );
  water.rotation.x = -Math.PI / 2;
  water.position.set(x, y + 0.055, z);
  water.userData.isWater = true;
  water.userData.waterMaterial = waterMat;
  drScene.add(water);
}

function addBottle(x, y, z, h = 0.27) {
  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(0.045, 0.045, h, 12),
    new THREE.MeshStandardMaterial({ color: 0x0a2a3a, roughness: 0.3, metalness: 0.6, transparent: true, opacity: 0.7 })
  );
  body.position.set(x, y + h / 2, z);
  body.castShadow = true;
  drScene.add(body);

  const cap = new THREE.Mesh(
    new THREE.SphereGeometry(0.032, 8, 8),
    new THREE.MeshStandardMaterial({ color: 0x1a0a00, roughness: 0.5, metalness: 0.6 })
  );
  cap.position.set(x, y + h + 0.02, z);
  drScene.add(cap);
}

function addFunnel(x, y, z, h = 0.14) {
  const funnel = new THREE.Mesh(
    new THREE.ConeGeometry(h * 0.6, h, 12),
    new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.6, metalness: 0.3 })
  );
  funnel.position.set(x, y + h / 2, z);
  funnel.castShadow = true;
  drScene.add(funnel);
}

function addThermometer(x, y, z) {
  const rod = new THREE.Mesh(
    new THREE.CylinderGeometry(0.004, 0.004, 0.22, 4),
    new THREE.MeshStandardMaterial({ color: 0x0a0a0a, roughness: 0.5, metalness: 0.8 })
  );
  rod.position.set(x, y, z);
  rod.castShadow = true;
  drScene.add(rod);

  const bulb = new THREE.Mesh(
    new THREE.SphereGeometry(0.018, 8, 8),
    new THREE.MeshStandardMaterial({ color: 0xff3000, roughness: 0.3, metalness: 0.4 })
  );
  bulb.position.set(x, y - 0.12, z);
  drScene.add(bulb);
}

function addWallBoard() {
  const board = new THREE.Mesh(
    new THREE.BoxGeometry(5.8, 2.0, 0.065),
    new THREE.MeshStandardMaterial({ color: 0x361a0a, roughness: 0.94, metalness: 0.05 })
  );
  board.position.set(0, 1.65, -7.88);
  board.receiveShadow = true;
  drScene.add(board);
}

function addCabinetShelf(x, y, z) {
  const shelf = new THREE.Mesh(
    new THREE.BoxGeometry(0.6, 0.1, 0.4),
    new THREE.MeshStandardMaterial({ color: 0x2a1808, roughness: 0.85, metalness: 0.1 })
  );
  shelf.position.set(x, y, z);
  shelf.castShadow = shelf.receiveShadow = true;
  drScene.add(shelf);

  [0, 0.45, 0.9].forEach((off, i) => {
    const leg = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, y, 0.06),
      new THREE.MeshStandardMaterial({ color: 0x1a0a00, roughness: 0.9, metalness: 0.05 })
    );
    leg.position.set(x - 0.25 + off, y / 2, z);
    leg.castShadow = true;
    drScene.add(leg);
  });
}

/* ── Hardcopy Photos (with texture shader) ── */

function makeHardcopyPhoto(src, w, h) {
  const mat = new THREE.ShaderMaterial({
    uniforms: { ...HARDCOPY_SHADER.uniforms },
    vertexShader: HARDCOPY_SHADER.vertexShader,
    fragmentShader: HARDCOPY_SHADER.fragmentShader,
    side: THREE.DoubleSide,
    transparent: true,
  });

  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  mesh.castShadow = true;

  drTextureLoader.load(src, tex => {
    tex.minFilter = THREE.LinearFilter;
    tex.generateMipmaps = false;
    mesh.material.uniforms.uTexture.value = tex;
    mesh.material.uniforms.uTexture.value.needsUpdate = true;

    // Fade in the photo
    const t0 = Date.now();
    const origOpacity = mesh.material.uniforms.uPaperTint.value.getHex();
    (function fadeIn() {
      const t = Math.min(1, (Date.now() - t0) / 1600);
      mesh.material.opacity = t * 0.88;
      if (t < 1) requestAnimationFrame(fadeIn);
    })();
  });

  return mesh;
}

function buildEnlargerPhotos() {
  const imgs = ZONES.enlarger.images;
  const offsets = [[0, 0], [-0.28, 0.18], [0.28, 0.18], [-0.12, -0.20], [0.18, -0.16]];
  const rots = [0, 0.12, -0.10, 0.08, -0.08];

  imgs.forEach((src, i) => {
    if (i >= offsets.length) return;
    const mesh = makeHardcopyPhoto(src, 0.58, 0.44);
    mesh.rotation.x = -Math.PI / 2;
    mesh.rotation.z = rots[i];
    mesh.position.set(0 + offsets[i][0], TABLE_TOP + 0.012, -2.2 + offsets[i][1]);
    mesh.userData = { zone: 'enlarger', idx: i };
    drPhotoMeshes.push(mesh);
    drScene.add(mesh);
  });
}

function buildDevelopingPhotos() {
  const imgs = ZONES.developing.images;
  const offsets = [[0, 0], [-0.08, 0.10], [0.10, -0.09], [-0.10, -0.12], [0.12, 0.07], [0, -0.04]];
  const rots = [0, 0.08, -0.06, 0.10, -0.05, 0.04];

  imgs.forEach((src, i) => {
    if (i >= offsets.length) return;
    const mesh = makeHardcopyPhoto(src, 0.42, 0.32);
    mesh.rotation.x = -Math.PI / 2;
    mesh.rotation.z = rots[i];
    mesh.position.set(-3.2 + offsets[i][0], TABLE_TOP + 0.055, -2.0 + offsets[i][1]);
    mesh.userData = { zone: 'developing', idx: i };
    drPhotoMeshes.push(mesh);
    drScene.add(mesh);
  });
}

function buildWashPhotos() {
  const imgs = ZONES.wash.images;
  const offsets = [[0, 0], [-0.09, 0.12], [0.10, -0.10], [-0.12, -0.09], [0.12, 0.05], [0.01, -0.14]];
  const rots = [0, -0.07, 0.10, -0.05, 0.08, -0.03];

  imgs.forEach((src, i) => {
    if (i >= offsets.length) return;
    const mesh = makeHardcopyPhoto(src, 0.42, 0.32);
    mesh.rotation.x = -Math.PI / 2;
    mesh.rotation.z = rots[i];
    mesh.position.set(3.0 + offsets[i][0], TABLE_TOP + 0.06, -2.2 + offsets[i][1]);
    mesh.userData = { zone: 'wash', idx: i };
    drPhotoMeshes.push(mesh);
    drScene.add(mesh);
  });
}

function buildWallPhotos() {
  const imgs = ZONES.wall.images;
  const cols = 4, rows = 2, w = 1.05, h = 0.74, gX = 1.18, gY = 0.90;
  const sX = -((cols - 1) * gX) / 2;
  const sY = 1.6;

  imgs.forEach((src, i) => {
    if (i >= cols * rows) return;
    const col = i % cols, row = Math.floor(i / cols);
    const mesh = makeHardcopyPhoto(src, w, h);
    mesh.position.set(sX + col * gX, sY - row * gY, -7.9);
    mesh.rotation.z = (Math.random() - 0.5) * 0.025;
    mesh.userData = { zone: 'wall', idx: i };
    drPhotoMeshes.push(mesh);
    drScene.add(mesh);
  });
}

/* ── Scroll Control ── */

let drScrollY = 0;
const SCROLL_PER_ZONE = () => window.innerHeight || 700;

function onDrWheel(e) {
  e.preventDefault();
  const delta = e.deltaY || 0;
  const maxScroll = SCROLL_PER_ZONE() * (ZONE_ORDER.length - 1);
  drScrollY = Math.max(0, Math.min(drScrollY + delta, maxScroll));
  drScrollT = drScrollY / maxScroll;
  updateZoneLabel();
}

function onDrTouchStart(e) {
  drTargetParaX = ((e.touches[0].clientX / window.innerWidth) * 2 - 1) * 0.5;
}

let _touchY = 0;
function onDrTouchMove(e) {
  e.preventDefault();
  const dy = _touchY - e.touches[0].clientY;
  _touchY = e.touches[0].clientY;
  const maxScroll = SCROLL_PER_ZONE() * (ZONE_ORDER.length - 1);
  drScrollY = Math.max(0, Math.min(drScrollY + dy * 1.5, maxScroll));
  drScrollT = drScrollY / maxScroll;
  updateZoneLabel();
  drTargetParaX = ((e.touches[0].clientX / window.innerWidth) * 2 - 1) * 0.4;
  drTargetParaY = -((e.touches[0].clientY / window.innerHeight) * 2 - 1) * 0.22;
}

function updateZoneLabel() {
  const nIdx = Math.round(drScrollT * (ZONE_ORDER.length - 1));
  if (nIdx !== currentZoneIdx) {
    currentZoneIdx = nIdx;
    const label = document.getElementById('darkroom-label');
    if (label) {
      label.textContent = ZONES[ZONE_ORDER[nIdx]].label;
      label.classList.add('visible');
      setTimeout(() => label.classList.remove('visible'), 2400);
    }
  }
}

function attachScroll() {
  const pg = document.getElementById('product-page');
  pg.addEventListener('wheel', onDrWheel, { passive: false });
  pg.addEventListener('touchstart', onDrTouchStart, { passive: true });
  pg.addEventListener('touchmove', onDrTouchMove, { passive: false });
}

function detachScroll() {
  const pg = document.getElementById('product-page');
  pg.removeEventListener('wheel', onDrWheel);
  pg.removeEventListener('touchstart', onDrTouchStart);
  pg.removeEventListener('touchmove', onDrTouchMove);
}

/* ── Mouse & Hover ── */

function onDrMouseMove(e) {
  if (!isDarkroomOpen) return;
  drTargetParaX = ((e.clientX / window.innerWidth) * 2 - 1) * 0.85;
  drTargetParaY = -((e.clientY / window.innerHeight) * 2 - 1) * 0.40;
  drMouse.set((e.clientX / window.innerWidth) * 2 - 1, -((e.clientY / window.innerHeight) * 2 - 1));
}

function onDrClick() {
  if (!isDarkroomOpen || !drHovered) return;
  const { zone, idx } = drHovered.userData;
  if (zone) openDarkroomViewer(zone, idx);
}

/* ── Render Loop ── */

let drTime = 0;
function darkroomRenderLoop() {
  if (!isDarkroomOpen) return;
  drAnimFrame = requestAnimationFrame(darkroomRenderLoop);
  drTime += 0.016;

  // Smooth parallax
  drParallaxX += (drTargetParaX - drParallaxX) * 0.042;
  drParallaxY += (drTargetParaY - drParallaxY) * 0.042;

  // Smooth scroll
  drRenderT += (drScrollT - drRenderT) * 0.065;

  if (drSplinePos && drSplineLook) {
    const sT = scrollTtoSplineT(drRenderT);
    const cT = Math.max(0, Math.min(1, sT));

    const pos = drSplinePos.getPointAt(cT);
    const look = drSplineLook.getPointAt(cT);

    drCamera.position.copy(pos);
    drCamera.position.x += drParallaxX * 0.25;
    drCamera.position.y += drParallaxY * 0.16;

    const la = look.clone();
    la.x += drParallaxX * 0.07;
    la.y += drParallaxY * 0.07;
    drCamera.lookAt(la);
  }

  // Update shader uniforms
  drScene.traverse(obj => {
    if (obj.material && obj.material.uniforms) {
      if (obj.material.uniforms.uTime) {
        obj.material.uniforms.uTime.value = drTime;
      }
      if (obj.userData.isWater) {
        obj.material.uniforms.uTime.value = drTime * 0.3;
      }
    }
  });

  // Raycaster hover
  drRaycaster.setFromCamera(drMouse, drCamera);
  const hits = drRaycaster.intersectObjects(drPhotoMeshes, false);
  const canvas = document.getElementById('darkroom-canvas');
  if (hits.length > 0) {
    drHovered = hits[0].object;
    if (canvas) canvas.style.cursor = 'pointer';
  } else {
    drHovered = null;
    if (canvas) canvas.style.cursor = 'default';
  }

  drComposer.render();
}

function onDrResize() {
  if (!drRenderer) return;
  drCamera.aspect = window.innerWidth / window.innerHeight;
  drCamera.updateProjectionMatrix();
  drRenderer.setSize(window.innerWidth, window.innerHeight);
  drComposer.setSize(window.innerWidth, window.innerHeight);
}

/* ── Viewer ── */

function openDarkroomViewer(zone, idx) {
  drViewerZone = zone;
  drViewerIdx = idx;
  const imgs = ZONES[zone].images;
  const viewer = document.getElementById('darkroom-viewer');
  const img = document.getElementById('darkroom-viewer-img');
  const meta = document.getElementById('darkroom-viewer-meta');

  img.src = imgs[idx];
  img.alt = `${zone} product ${idx + 1}`;
  img.style.animation = 'none';
  img.offsetHeight;
  img.style.animation = 'dr-develop 1.1s cubic-bezier(0.22, 1, 0.36, 1) forwards';

  meta.textContent = `${ZONES[zone].label} // ${idx + 1} / ${imgs.length}`;
  viewer.classList.add('active');
}

function closeDarkroomViewer() {
  document.getElementById('darkroom-viewer').classList.remove('active');
}

document.getElementById('darkroom-viewer-prev').addEventListener('click', () => {
  if (!drViewerZone) return;
  const n = ZONES[drViewerZone].images.length;
  openDarkroomViewer(drViewerZone, (drViewerIdx - 1 + n) % n);
});

document.getElementById('darkroom-viewer-next').addEventListener('click', () => {
  if (!drViewerZone) return;
  const n = ZONES[drViewerZone].images.length;
  openDarkroomViewer(drViewerZone, (drViewerIdx + 1) % n);
});

/* ── Main Toggle ── */

async function toggleProductGallery(open) {
  isDarkroomOpen = open;
  const page = document.getElementById('product-page');
  page.classList.toggle('active', open);
  document.body.style.overflow = open ? 'hidden' : 'auto';

  if (open) {
    initDarkroom();

    if (window.innerWidth <= 900 && drRenderer) {
      drRenderer.setPixelRatio(1);
    }

    const mobileEl = document.getElementById('darkroom-mobile');
    if (mobileEl) mobileEl.style.display = 'none';

    const canvas = document.getElementById('darkroom-canvas');
    if (canvas) canvas.style.display = 'block';

    drScrollY = 0;
    drScrollT = 0;
    drRenderT = 0;
    currentZoneIdx = 0;
    drParallaxX = 0;
    drParallaxY = 0;
    drTargetParaX = 0;
    drTargetParaY = 0;

    canvas.addEventListener('mousemove', onDrMouseMove);
    canvas.addEventListener('click', onDrClick);
    attachScroll();

    const z0 = ZONES.enlarger;
    drCamera.position.set(...z0.cameraPos);
    drCamera.position.z += 4.8;
    drCamera.position.y += 1.6;
    drCamera.lookAt(new THREE.Vector3(...z0.cameraLook));

    if (!drAssetsLoaded) {
      darkroomRenderLoop();
      drAssetsLoaded = true;
    }

    darkroomRenderLoop();

    // Intro zoom
    const t0 = Date.now();
    const startP = drCamera.position.clone();
    const endP = new THREE.Vector3(...z0.cameraPos);

    function zoom() {
      const t = Math.min(1, (Date.now() - t0) / 1100);
      const e = t < 1 ? t * t * (3 - 2 * t) : 1;
      drCamera.position.lerpVectors(startP, endP, e);
      drCamera.lookAt(new THREE.Vector3(...z0.cameraLook));
      if (t < 1 && drScrollT < 0.01) requestAnimationFrame(zoom);
    }
    requestAnimationFrame(zoom);

    const hint = document.getElementById('darkroom-hint');
    if (hint) {
      hint.classList.add('visible');
      setTimeout(() => hint.classList.remove('visible'), 4500);
    }

  } else {
    if (drAnimFrame) {
      cancelAnimationFrame(drAnimFrame);
      drAnimFrame = null;
    }
    const canvas = document.getElementById('darkroom-canvas');
    if (canvas) {
      canvas.removeEventListener('mousemove', onDrMouseMove);
      canvas.removeEventListener('click', onDrClick);
    }
    detachScroll();
    closeDarkroomViewer();
  }
}
