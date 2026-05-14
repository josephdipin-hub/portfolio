/* ═══════════════════════════════════════════════════════
   GLSL SHADER SYSTEM — unchanged
════════════════════════════════════════════════════════ */
const VERT_SHADER = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;
const FRAG_SHADER = `
  uniform float uTime;
  uniform float uVelocity;
  uniform float uIntensity;
  uniform sampler2D uTexture;
  uniform vec2 uResolution;
  varying vec2 vUv;
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p); vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1,0)), f.x), mix(hash(i + vec2(0,1)), hash(i + vec2(1,1)), f.x), f.y);
  }
  void main() {
    vec2 uv = vUv; float t = uTime * 0.4; float vel = uVelocity; float intensity = uIntensity;
    float nx = noise(uv * 4.0 + vec2(t, 0.0)); float ny = noise(uv * 4.0 + vec2(0.0, t * 1.3));
    vec2 displacement = vec2(nx - 0.5, ny - 0.5) * intensity * 0.012;
    float scanline = sin(uv.y * uResolution.y * 0.5 + t * 8.0) * 0.004 * intensity;
    displacement.x += scanline;
    float blockY = floor(uv.y * 24.0) / 24.0;
    float blockRand = hash(vec2(blockY, floor(t * 6.0)));
    float blockStrength = step(0.85, blockRand) * vel * 0.04;
    displacement.x += blockStrength * (blockRand - 0.5) * 2.0;
    float rgbSplit = (intensity * 0.008) + (vel * 0.025);
    vec2 uvR = clamp(uv + displacement + vec2( rgbSplit, 0.0), 0.001, 0.999);
    vec2 uvG = clamp(uv + displacement, 0.001, 0.999);
    vec2 uvB = clamp(uv + displacement + vec2(-rgbSplit, 0.0), 0.001, 0.999);
    float r = texture2D(uTexture, uvR).r; float g = texture2D(uTexture, uvG).g;
    float b = texture2D(uTexture, uvB).b; float a = texture2D(uTexture, uvG).a;
    gl_FragColor = vec4(r, g, b, a * intensity * 0.5);
  }
`;
const glCanvas = document.getElementById('glsl-canvas');
let glRenderer, glScene, glCamera, glMesh, glUniforms;
let glVelocity = 0, glIntensity = 0, glTargetVel = 0, glTargetInt = 0, glLastY = window.pageYOffset;
function initGL() {
  if (!window.THREE) return;
  glRenderer = new THREE.WebGLRenderer({ canvas: glCanvas, alpha: true, antialias: false });
  glRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  glRenderer.setSize(window.innerWidth, window.innerHeight);
  glScene = new THREE.Scene(); glCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const texCanvas = document.createElement('canvas'); texCanvas.width = 2; texCanvas.height = 2;
  const ctx = texCanvas.getContext('2d'); ctx.fillStyle = '#111111'; ctx.fillRect(0, 0, 2, 2);
  glUniforms = {
    uTime: { value: 0 }, uVelocity: { value: 0 }, uIntensity: { value: 0 },
    uTexture: { value: new THREE.CanvasTexture(texCanvas) },
    uResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) }
  };
  const mat = new THREE.ShaderMaterial({ vertexShader: VERT_SHADER, fragmentShader: FRAG_SHADER, uniforms: glUniforms, transparent: true, blending: THREE.NormalBlending });
  glMesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat); glScene.add(glMesh);
  window.addEventListener('resize', () => { glRenderer.setSize(window.innerWidth, window.innerHeight); glUniforms.uResolution.value.set(window.innerWidth, window.innerHeight); });
}
function glRenderLoop(ts) {
  requestAnimationFrame(glRenderLoop);
  glVelocity += (glTargetVel - glVelocity) * 0.12; glIntensity += (glTargetInt - glIntensity) * 0.08;
  glTargetVel *= 0.88; glTargetInt *= 0.92;
  glUniforms.uTime.value = ts * 0.001; glUniforms.uVelocity.value = glVelocity; glUniforms.uIntensity.value = glIntensity;
  glRenderer.render(glScene, glCamera);
}
function triggerGLGlitch(velocity) { if (!glUniforms) return; glTargetVel = Math.min(velocity / 800, 1.0); glTargetInt = 0.4 + glTargetVel * 0.6; }
initGL(); if (glRenderer) glRenderLoop(0);
window.addEventListener('scroll', () => { const currentY = window.pageYOffset; const delta = Math.abs(currentY - glLastY); glLastY = currentY; if (delta > 2) triggerGLGlitch(delta * 8); }, { passive: true });

/* ═══════════════════════════════════════════════════════
   FASHION GALLERY — original code, completely untouched
════════════════════════════════════════════════════════ */
const container       = document.getElementById('brush-container');
const master          = document.getElementById('master-site');
const albumScroll     = document.getElementById('album-scroll');
const transitionLayer = document.getElementById('asdf-transition-layer');
const portfolioPage   = document.getElementById('portfolio-page');

let lastScrollY   = window.pageYOffset;
let lastScrollX   = 0;
let isAlbumOpen   = false;
let scrollTicking = false;
let albumTicking  = false;

function createMoshStamp(yPos) {
  if (isAlbumOpen) return;
  const existing = container.querySelectorAll('.brush-stamp');
  if (existing.length >= 2) existing[0].remove();
  const vh = window.innerHeight;
  const noMoshEls = document.querySelectorAll('[data-no-mosh]');
  let safeHeight = vh;
  noMoshEls.forEach(el => {
    const rect = el.getBoundingClientRect();
    if (rect.top < vh && rect.bottom > 0) { const edge = Math.max(0, rect.top); if (edge < safeHeight) safeHeight = edge; }
  });
  if (safeHeight <= 0) return;
  noMoshEls.forEach(el => el.style.visibility = 'hidden');
  const stamp = document.createElement('div');
  stamp.className = 'brush-stamp';
  stamp.appendChild(master.cloneNode(true));
  stamp.style.top = `-${yPos}px`;
  noMoshEls.forEach(el => el.style.visibility = '');
  if (safeHeight < vh) stamp.style.clipPath = `inset(0 0 ${vh - safeHeight}px 0)`;
  container.appendChild(stamp);
  stamp.animate([
    { opacity: 0.75, transform: 'translateY(0px) scale(1)' },
    { opacity: 0,    transform: 'translateY(50px) scale(1.01)' }
  ], { duration: 850, easing: 'cubic-bezier(0.25, 1, 0.5, 1)' }).onfinish = () => stamp.remove();
}

function triggerAsdf() {
  if (!isAlbumOpen) return;
  const photos = document.querySelectorAll('#album-scroll .album-photo');
  const vw = window.innerWidth;
  const visible = [];
  photos.forEach((photo, i) => {
    const img = photo.querySelector('img');
    const rect = img.getBoundingClientRect();
    if (rect.right > 0 && rect.left < vw) visible.push({ img, rect, i, total: photos.length });
  });
  visible.forEach(({ img, rect, i, total }) => {
    const stamp = document.createElement('div');
    stamp.className = 'asdf-stamp';
    const lClip = i === 0 ? '0px' : '-1000px';
    const rClip = i === total - 1 ? '0px' : '-1000px';
    Object.assign(stamp.style, { width: `${rect.width}px`, height: `${rect.height}px`, left: `${rect.left}px`, top: `${rect.top}px`, clipPath: `inset(0px ${rClip} 0px ${lClip})` });
    stamp.appendChild(img.cloneNode());
    transitionLayer.appendChild(stamp);
    stamp.animate([
      { opacity: 1, transform: 'scaleX(1) translateX(0px)' },
      { opacity: 0, transform: 'scaleX(2.8) translateX(180px)' }
    ], { duration: 500, easing: 'cubic-bezier(0.33, 1, 0.68, 1)', fill: 'forwards' }).onfinish = () => stamp.remove();
  });
}

window.addEventListener('scroll', () => {
  if (scrollTicking) return; scrollTicking = true;
  requestAnimationFrame(() => {
    const currentY = window.pageYOffset;
    if (Math.abs(currentY - lastScrollY) > 35) { createMoshStamp(currentY); lastScrollY = currentY; }
    document.body.classList.toggle('scrolled', currentY > 50);
    scrollTicking = false;
  });
}, { passive: true });

albumScroll.addEventListener('scroll', () => {
  if (albumTicking) return; albumTicking = true;
  requestAnimationFrame(() => {
    if (Math.abs(albumScroll.scrollLeft - lastScrollX) > 15) { triggerAsdf(); lastScrollX = albumScroll.scrollLeft; }
    albumTicking = false;
  });
}, { passive: true });

albumScroll.addEventListener('wheel', (e) => { e.preventDefault(); albumScroll.scrollLeft += e.deltaY; }, { passive: false });

function togglePortfolio(open) {
  isAlbumOpen = open;
  portfolioPage.classList.toggle('active', open);
  document.body.style.overflow = open ? 'hidden' : 'auto';
}


/* ═══════════════════════════════════════════════════════
   DARKROOM — PRODUCT GALLERY
   Full rebuild: GLB assets, liquid tray shader,
   pre-defined CatmullRom camera path, BokehPass DOF,
   UnrealBloom, FilmGrain, Vignette. Mobile scroll fallback.
════════════════════════════════════════════════════════ */

/* ── Zone / image data ── */
const PRODUCT_ZONES = {
  tray: {
    label: 'WOVEN // NATURAL FIBRE',
    cameraPos: new THREE.Vector3(-2.2, 0.6, 0.8),
    cameraLookAt: new THREE.Vector3(-2.2, -1.2, -1.5),
    focusDepth: 2.2,
    images: [
      { src: 'images/product-woven-basket-forest-editorial-bangalore-1.webp',        alt: 'Woven basket forest editorial' },
      { src: 'images/product-woven-basket-bougainvillea-lifestyle-bangalore-2.webp', alt: 'Woven basket bougainvillea' },
      { src: 'images/product-woven-tote-basket-dried-flowers-studio-3.webp',         alt: 'Woven tote dried flowers' },
      { src: 'images/product-woven-basket-overhead-citrus-4.webp',                   alt: 'Woven basket overhead citrus' },
      { src: 'images/product-woven-crossbody-bag-spotlight-studio-5.webp',           alt: 'Woven crossbody spotlight' },
      { src: 'images/product-woven-open-basket-lifestyle-bangalore-6.webp',          alt: 'Open weave basket lifestyle' },
      { src: 'images/product-natural-fibre-mat-table-setting-brass-7.webp',          alt: 'Natural fibre mat brass' },
    ]
  },
  contact: {
    label: 'SOLE // LP SNEAKERS',
    cameraPos: new THREE.Vector3(0, 1.8, 2.0),
    cameraLookAt: new THREE.Vector3(0, 0.5, -6.5),
    focusDepth: 8.5,
    images: [
      { src: 'images/product-louis-philippe-sneaker-side-profile-studio-1.webp',  alt: 'LP sneaker side profile' },
      { src: 'images/product-louis-philippe-sneaker-sole-detail-studio-2.webp',   alt: 'LP sneaker sole detail' },
      { src: 'images/product-louis-philippe-sneaker-heel-suede-detail-3.webp',    alt: 'LP sneaker heel suede' },
      { src: 'images/product-louis-philippe-sneaker-toe-logo-macro-4.webp',       alt: 'LP sneaker toe logo' },
      { src: 'images/product-louis-philippe-sneaker-sole-bottom-studio-5.webp',   alt: 'LP sneaker sole bottom' },
      { src: 'images/product-louis-philippe-sneaker-pair-front-angle-6.webp',     alt: 'LP sneaker pair front' },
      { src: 'images/product-louis-philippe-sneaker-pair-top-overhead-7.webp',    alt: 'LP sneaker pair overhead' },
      { src: 'images/product-louis-philippe-sneaker-pair-rear-angle-8.webp',      alt: 'LP sneaker pair rear' },
    ]
  },
  line: {
    label: 'DRAPE // LP TIES',
    cameraPos: new THREE.Vector3(0.5, 2.8, 1.5),
    cameraLookAt: new THREE.Vector3(0, 1.8, -1.0),
    focusDepth: 3.0,
    images: [
      { src: 'images/product-louis-philippe-tie-box-flatlay-studio-1.webp',    alt: 'LP tie box flatlay' },
      { src: 'images/product-louis-philippe-tie-set-pedestal-studio-2.webp',   alt: 'LP tie set pedestal' },
      { src: 'images/product-louis-philippe-navy-tie-rolled-wire-grid-3.webp', alt: 'LP navy tie rolled' },
      { src: 'images/product-louis-philippe-burgundy-tie-curved-paper-4.webp', alt: 'LP burgundy tie' },
      { src: 'images/product-louis-philippe-belt-wallet-wood-5.webp',          alt: 'LP belt wallet wood' },
    ]
  },
  enlarger: {
    label: 'LENS // VISIONEXPRESS',
    cameraPos: new THREE.Vector3(2.8, 1.0, 1.8),
    cameraLookAt: new THREE.Vector3(2.8, -0.5, -1.0),
    focusDepth: 2.8,
    images: [
      { src: 'images/product-visionexpress-frames-sunclip-flatlay-1.webp',     alt: 'VisionExpress flatlay' },
      { src: 'images/product-visionexpress-frames-lens-macro-detail-2.webp',   alt: 'VisionExpress macro' },
      { src: 'images/product-visionexpress-frames-front-face-studio-3.webp',   alt: 'VisionExpress front' },
      { src: 'images/product-visionexpress-frames-temple-side-profile-4.webp', alt: 'VisionExpress temple' },
      { src: 'images/product-visionexpress-frames-sunclip-3quarter-5.webp',    alt: 'VisionExpress 3/4' },
    ]
  },
  wall: {
    label: 'VESSEL // MACCLITE',
    cameraPos: new THREE.Vector3(-4.5, 0.8, 1.5),
    cameraLookAt: new THREE.Vector3(-7.2, 0.3, -1.5),
    focusDepth: 4.0,
    images: [
      { src: 'images/product-macclite-wok-overhead-blue-studio-1.webp',       alt: 'MACclite wok overhead blue' },
      { src: 'images/product-macclite-wok-angled-dramatic-studio-2.webp',     alt: 'MACclite wok angled' },
      { src: 'images/product-macclite-crepe-pan-side-profile-studio-3.webp',  alt: 'MACclite crepe pan' },
      { src: 'images/product-macclite-tawa-frontal-studio-4.webp',            alt: 'MACclite tawa frontal' },
      { src: 'images/product-macclite-pan-handle-macro-detail-5.webp',        alt: 'MACclite handle macro' },
      { src: 'images/product-macclite-pan-kitchen-counter-lifestyle-6.webp',  alt: 'MACclite kitchen counter' },
      { src: 'images/product-macclite-tawa-overhead-burlap-lifestyle-7.webp', alt: 'MACclite tawa burlap' },
      { src: 'images/product-macclite-wok-overhead-props-lifestyle-8.webp',   alt: 'MACclite wok props' },
      { src: 'images/product-macclite-pan-uttapam-food-styling-9.webp',       alt: 'MACclite uttapam food' },
    ]
  }
};

const ZONE_ORDER = ['tray', 'contact', 'line', 'enlarger', 'wall'];

/* ── Model paths — put all GLBs in /models/ folder ── */
const MODEL_PATHS = {
  enlarger:   'models/durst_enlarger_darkroom_asset.glb',
  table:      'models/wood_table_pbr_low-poly.glb',
  cabinet:    'models/laboratory_cabinet_storage__pbr_low_poly__free.glb',
  glassware:  'models/chemistry_glassware.glb',
  bottle:     'models/glass_bottle-freepoly.org.glb',
  flask:      'models/free_conical_flask__laboratory__low_poly.glb',
  tray:       'models/seeding_germination_watering_tray.glb',
  thermometer:'models/thermometer.glb',
  stopwatch:  'models/stopwatch-284.glb',
  polaroid:   'models/polaroid_photo_sample.glb',
  funnel:     'models/funnel_3.glb',
  pin:        'models/cc0_-_pin_2.glb',
  clip:       'models/simple_paper_clip.glb',
};

/* ── Vignette + red tone shader ── */
const VignetteShader = {
  uniforms: { tDiffuse:{value:null}, darkness:{value:1.6}, redTint:{value:0.04} },
  vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float darkness;
    uniform float redTint;
    varying vec2 vUv;
    void main(){
      vec4 c = texture2D(tDiffuse, vUv);
      vec2 uv = vUv*(1.0-vUv.yx);
      float vig = pow(uv.x*uv.y*15.0, 0.9);
      c.r = min(1.0, c.r + redTint * (1.0-vig));
      c.rgb *= mix(1.0-darkness*0.45, 1.0, vig);
      gl_FragColor = c;
    }
  `
};

/* ── Liquid / developing tray shader ── */
const LiquidShader = {
  uniforms: {
    tPhoto:    { value: null },
    tNormal:   { value: null },
    uTime:     { value: 0 },
    uDevelop:  { value: 0 },   // 0=undeveloped 1=fully visible
  },
  vertexShader: `
    varying vec2 vUv;
    varying vec3 vNormal;
    void main(){ vUv=uv; vNormal=normal; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }
  `,
  fragmentShader: `
    uniform sampler2D tPhoto;
    uniform sampler2D tNormal;
    uniform float uTime;
    uniform float uDevelop;
    varying vec2 vUv;
    void main(){
      // Animated water surface distortion
      vec2 n1 = texture2D(tNormal, vUv*1.5 + vec2(uTime*0.015, uTime*0.012)).rg * 2.0 - 1.0;
      vec2 n2 = texture2D(tNormal, vUv*2.2 - vec2(uTime*0.010, uTime*0.018)).rg * 2.0 - 1.0;
      vec2 distort = (n1+n2) * 0.008;
      // Sample photo under liquid with distortion
      vec4 photo = texture2D(tPhoto, vUv + distort * uDevelop);
      // Liquid colour — dark brownish chemical
      vec4 liquid = vec4(0.04, 0.02, 0.01, 0.88);
      // Photo emerges from liquid as develop increases
      float emerge = smoothstep(0.0, 1.0, uDevelop);
      // Wet surface highlight
      vec2 cUv = vUv - 0.5;
      float highlight = pow(max(0.0, 1.0 - length(cUv)*2.5), 3.0) * 0.15;
      vec3 col = mix(liquid.rgb, photo.rgb, emerge * 0.92);
      col += highlight * vec3(0.8, 0.7, 0.6);
      // Dark edges — tray walls
      float edge = smoothstep(0.0, 0.04, min(vUv.x, min(1.0-vUv.x, min(vUv.y, 1.0-vUv.y))));
      col *= edge;
      gl_FragColor = vec4(col, mix(0.85, 0.95, emerge));
    }
  `
};

/* ── Darkroom state ── */
let drRenderer, drScene, drCamera, drComposer, drBokeh;
let drAnimFrame = null;
let isDarkroomOpen = false;
let drInited = false;
let drAssetsLoaded = false;
let drTextureLoader, drGLTFLoader;
let drTextureCache = {};
let drModelCache = {};
let drLiquidMeshes = [];     // meshes using liquid shader — updated per frame
let drPhotoMeshes  = [];     // all clickable photo meshes
let drHovered = null;
let drRaycaster, drMouse;
let drViewerZone = null, drViewerIdx = 0;

/* Camera path state */
let currentZoneIdx  = 0;
let drCamPathT      = 0;     // 0–1 along spline during travel
let drCamTraveling  = false;
let drCamTargetT    = 0;
let drParallaxX     = 0, drParallaxY = 0;
let drTargetParaX   = 0, drTargetParaY = 0;

/* ── Zone camera spline ── */
// Points in zone order: tray, contact, line, enlarger, wall
// The camera follows this Catmull-Rom spline when navigating
let drSpline;

function buildCameraSpline() {
  const pts = ZONE_ORDER.map(k => PRODUCT_ZONES[k].cameraPos.clone());
  // Add duplicate end points for smooth Catmull-Rom
  pts.unshift(pts[0].clone());
  pts.push(pts[pts.length-1].clone());
  drSpline = new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.5);
}

function zoneT(idx) {
  // Map zone index 0..4 to 0..1 on the spline (accounting for padded endpoints)
  return (idx + 1) / (ZONE_ORDER.length + 1);
}

/* ── Init Three.js ── */
function initDarkroom() {
  if (!window.THREE || drInited) return;
  drInited = true;

  const canvas = document.getElementById('darkroom-canvas');

  drRenderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  drRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  drRenderer.setSize(window.innerWidth, window.innerHeight);
  drRenderer.setClearColor(0x000000, 1);
  drRenderer.toneMapping = THREE.ACESFilmicToneMapping;
  drRenderer.toneMappingExposure = 0.9;
  drRenderer.shadowMap.enabled = true;
  drRenderer.shadowMap.type = THREE.PCFSoftShadowMap;
  drRenderer.physicallyCorrectLights = true;

  drScene  = new THREE.Scene();
  drScene.fog = new THREE.FogExp2(0x030001, 0.045);

  drCamera = new THREE.PerspectiveCamera(52, window.innerWidth/window.innerHeight, 0.05, 80);
  drCamera.position.copy(PRODUCT_ZONES.tray.cameraPos);
  drCamera.lookAt(PRODUCT_ZONES.tray.cameraLookAt);

  drRaycaster = new THREE.Raycaster();
  drMouse     = new THREE.Vector2(-9,-9);

  drTextureLoader = new THREE.TextureLoader();
  drGLTFLoader    = new THREE.GLTFLoader();

  buildCameraSpline();

  /* ── Post-processing ── */
  drComposer = new THREE.EffectComposer(drRenderer);
  drComposer.addPass(new THREE.RenderPass(drScene, drCamera));

  // Bloom — tight, only safelight and hot highlights bleed
  const bloom = new THREE.UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    0.45, 0.5, 0.82
  );
  drComposer.addPass(bloom);

  // Film grain — very subtle, just texture
  const film = new THREE.FilmPass(0.18, 0.03, 512, false);
  drComposer.addPass(film);

  // Vignette + red tint
  const vig = new THREE.ShaderPass(VignetteShader);
  vig.renderToScreen = true;
  drComposer.addPass(vig);

  window.addEventListener('resize', onDrResize);
}

/* ── Build scene ── */
async function buildDarkroomScene() {
  buildRoom();
  await loadAllAssets();
  drAssetsLoaded = true;
}

function buildRoom() {
  // PBR wall material
  const wallMat  = new THREE.MeshStandardMaterial({ color:0x080103, roughness:0.96, metalness:0.0 });
  const floorMat = new THREE.MeshStandardMaterial({ color:0x060102, roughness:0.98, metalness:0.0 });

  // Walls
  [[0,0,-8,  0,0],               // back
   [-9,0,0,  0, Math.PI/2],      // left
   [9,0,0,   0,-Math.PI/2],      // right
   [0,6,0,   Math.PI/2,0],       // ceiling
  ].forEach(([x,y,z, rx,ry]) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(30,14), wallMat);
    m.position.set(x,y,z); m.rotation.x=rx; m.rotation.y=ry||0;
    m.receiveShadow=true; drScene.add(m);
  });

  // Floor
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(30,30), floorMat);
  floor.rotation.x = -Math.PI/2; floor.position.y=-3.5;
  floor.receiveShadow=true; drScene.add(floor);

  // Rubber floor mat under enlarger table
  const matGeo = new THREE.BoxGeometry(2.8, 0.03, 1.8);
  const matMat = new THREE.MeshStandardMaterial({ color:0x050403, roughness:0.99 });
  const mat = new THREE.Mesh(matGeo, matMat);
  mat.position.set(2.8,-3.48,-1.5); drScene.add(mat);

  /* ── Lighting ── */

  // Ambient — barely there
  drScene.add(new THREE.AmbientLight(0x0d0003, 1.5));

  // SAFELIGHT — primary red overhead
  const safe = new THREE.PointLight(0xff1f00, 8.0, 20, 2);
  safe.position.set(-1, 5.5, 0);
  safe.castShadow=true;
  safe.shadow.mapSize.width = safe.shadow.mapSize.height = 1024;
  drScene.add(safe);

  // Safelight housing mesh
  const shGeo = new THREE.CylinderGeometry(0.05, 0.18, 0.25, 12);
  const shMat = new THREE.MeshStandardMaterial({ color:0x1a1a1a, roughness:0.6, metalness:0.3 });
  const sh = new THREE.Mesh(shGeo, shMat);
  sh.position.set(-1, 5.7, 0); drScene.add(sh);
  // Bulb glow
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.045,10,8), new THREE.MeshBasicMaterial({color:0xff4400}));
  bulb.position.set(-1, 5.55, 0); drScene.add(bulb);
  // Cord
  const cord = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-1,6,0), new THREE.Vector3(-1,5.85,0)]),
    new THREE.LineBasicMaterial({color:0x222222})
  );
  drScene.add(cord);

  // Second smaller safelight right side
  const safe2 = new THREE.PointLight(0xff1500, 3.5, 12, 2);
  safe2.position.set(4, 5.0, 0); drScene.add(safe2);
  const sh2 = new THREE.Mesh(shGeo.clone(), shMat.clone());
  sh2.position.set(4, 5.2, 0); drScene.add(sh2);
  const bulb2 = new THREE.Mesh(new THREE.SphereGeometry(0.04,10,8), new THREE.MeshBasicMaterial({color:0xff3300}));
  bulb2.position.set(4, 5.05, 0); drScene.add(bulb2);

  // ENLARGER beam — warm white tight cone
  const enlargerBeam = new THREE.SpotLight(0xfff8e7, 25, 5, Math.PI/10, 0.3, 2);
  enlargerBeam.position.set(2.8, 2.2, -1.5);
  enlargerBeam.target.position.set(2.8, -2.5, -1.5);
  enlargerBeam.castShadow=true;
  enlargerBeam.shadow.mapSize.width = enlargerBeam.shadow.mapSize.height = 512;
  drScene.add(enlargerBeam); drScene.add(enlargerBeam.target);

  // Chemical tray glow — orange-red from below left
  const trayGlow = new THREE.PointLight(0xff3300, 2.0, 5, 2);
  trayGlow.position.set(-2.2, -2.0, -0.5); drScene.add(trayGlow);

  /* ── Drying wire ── */
  const wireMat = new THREE.MeshStandardMaterial({ color:0x2a2a2a, roughness:0.5, metalness:0.6 });
  [-0.3, 0.4].forEach(z => {
    const wGeo = new THREE.CylinderGeometry(0.008, 0.008, 16, 8);
    wGeo.rotateZ(Math.PI/2);
    const w = new THREE.Mesh(wGeo, wireMat);
    w.position.set(0, 2.5, z); drScene.add(w);
    // Wall brackets
    [-7, 7].forEach(x => {
      const b = new THREE.Mesh(new THREE.CylinderGeometry(0.015,0.015,0.18,8), wireMat);
      b.position.set(x, 2.5, z); drScene.add(b);
    });
  });
}

async function loadAllAssets() {
  const loading = document.getElementById('dr-loading');
  const fill    = document.getElementById('dr-loading-fill');
  const sub     = document.getElementById('dr-loading-sub');

  const tasks = [
    // Water normal map for liquid shader
    () => new Promise(res => {
      drTextureLoader.load(
        'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/textures/waternormals.jpg',
        tex => { tex.wrapS=tex.wrapT=THREE.RepeatWrapping; drTextureCache['waternormal']=tex; res(); },
        undefined, res
      );
    }),
    // GLB models
    ...Object.entries(MODEL_PATHS).map(([key, path]) => () => new Promise(res => {
      drGLTFLoader.load(path, gltf => {
        // Enable shadows on all meshes
        gltf.scene.traverse(n => {
          if (n.isMesh) { n.castShadow=true; n.receiveShadow=true; }
        });
        drModelCache[key] = gltf.scene;
        res();
      }, undefined, res); // silent fail if model missing
    })),
  ];

  let done = 0;
  const total = tasks.length;

  for (const task of tasks) {
    await task();
    done++;
    const pct = Math.round((done/total)*100);
    if (fill) fill.style.width = `${pct}%`;
    if (sub)  sub.textContent  = `LOADING_ASSETS // ${pct}%`;
  }

  // Place all scene objects
  placeSceneObjects();

  // Hide loading screen
  if (loading) {
    loading.style.opacity = '0';
    setTimeout(() => { loading.classList.add('hidden'); }, 800);
  }

  // Show hint
  const hint = document.getElementById('darkroom-hint');
  if (hint) { hint.classList.add('visible'); setTimeout(() => hint.classList.remove('visible'), 4000); }
}

function cloneModel(key, scale, pos, rot) {
  if (!drModelCache[key]) return null;
  const m = drModelCache[key].clone(true);
  m.scale.setScalar(scale);
  if (pos) m.position.set(...pos);
  if (rot) m.rotation.set(...rot);
  drScene.add(m);
  return m;
}

function placeSceneObjects() {
  /* ── LEFT TABLE — developing trays (woven zone) ── */
  // Wood table
  const lt = cloneModel('table', 0.9, [-2.2, -2.0, -1.5], [0,0,0]);

  // 3 developing trays on table
  const trayScale = 0.018;
  const trayPositions = [[-2.8,-2.5,-1.0], [-2.2,-2.5,-1.0], [-1.6,-2.5,-1.0]];
  trayPositions.forEach(pos => {
    const t = cloneModel('tray', trayScale, pos, [0,0,0]);
  });

  // Thermometer in first tray
  cloneModel('thermometer', 0.015, [-2.8,-2.3,-0.9], [0,0,Math.PI/6]);

  // Print tongs (procedural — two thin arms)
  buildTongs(-1.9, -2.3, -0.8, 0.3);
  buildTongs(-2.5, -2.3, -0.7, -0.2);

  // Squeegee
  buildSqueegee(-1.5, -2.2, -1.2);

  // Funnel in chemical area
  cloneModel('funnel', 0.12, [-3.0, -2.0, -1.8], [0,0,0]);

  // Flask
  cloneModel('flask', 0.018, [-3.2, -2.0, -1.5], [0,0,0]);

  /* ── CONTACT SHEET WALL — sneakers (back wall) ── */
  buildContactSheetWall();

  /* ── DRYING LINE — ties (overhead wire) ── */
  buildDryingLine();

  /* ── RIGHT TABLE — enlarger + eyewear (enlarger zone) ── */
  cloneModel('table', 0.9, [2.8, -2.0, -1.5], [0,0,0]);
  cloneModel('enlarger', 0.012, [2.8, -2.1, -1.8], [0, Math.PI, 0]);
  cloneModel('stopwatch', 0.012, [1.8, -2.0, -0.9], [0,0,0]);

  // Glassware set on right table shelf
  cloneModel('glassware', 0.025, [3.8, -2.0, -2.0], [0,0,0]);

  // Eyewear on enlarger baseboard (enlarger zone photos)
  buildEnlargerBaseboard();

  /* ── SIDE WALL — cookware prints (left wall) ── */
  buildSideWallPrints();

  /* ── CABINET / SHELVES ── */
  const cab = cloneModel('cabinet', 0.022, [-6.5, -0.5, -4.5], [0, Math.PI/2, 0]);

  // Chemical bottles on cabinet shelves
  [-6.0,-6.5,-7.0].forEach((x,i) => {
    cloneModel('bottle', 0.018, [x, 1.2-(i*0.1), -4.2], [0, Math.random()*0.3, 0]);
  });
  cloneModel('flask', 0.018, [-6.8, 0.8, -4.2], [0, 0.4, 0]);
  cloneModel('funnel', 0.10, [-6.2, 0.8, -4.0], [0, 0, 0]);

  // Polaroid on shelf
  cloneModel('polaroid', 0.008, [-6.5, 1.8, -4.0], [0, Math.PI/2+0.2, 0]);

  // Pin board above contact sheet
  buildPinboard();
}

/* ── Developing tray liquid shader for woven zone ── */
function buildLiquidTray(imgSrc, x, y, z, w, h) {
  const wn = drTextureCache['waternormal'];
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      tPhoto:   { value: null },
      tNormal:  { value: wn || null },
      uTime:    { value: 0 },
      uDevelop: { value: 0 },
    },
    vertexShader:   LiquidShader.vertexShader,
    fragmentShader: LiquidShader.fragmentShader,
    transparent: true,
    side: THREE.FrontSide,
  });

  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h, 32, 32), mat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(x, y, z);
  mesh.userData = { isLiquid: true, imgSrc, developing: false };
  drScene.add(mesh);
  drLiquidMeshes.push(mesh);
  drPhotoMeshes.push(mesh);

  // Load photo texture
  drTextureLoader.load(imgSrc, tex => {
    tex.minFilter = THREE.LinearFilter;
    tex.generateMipmaps = false;
    mat.uniforms.tPhoto.value = tex;
    // Auto-develop slowly
    const start = Date.now();
    (function develop() {
      const t = (Date.now()-start)/4000;
      mat.uniforms.uDevelop.value = Math.min(t, 1);
      if (t < 1) requestAnimationFrame(develop);
    })();
  });

  return mesh;
}

function buildContactSheetWall() {
  const imgs  = PRODUCT_ZONES.contact.images;
  const cols=4, rows=2, w=1.1, h=0.78, gX=1.22, gY=0.92;
  const sX = -((cols-1)*gX)/2;
  const sY = 1.2;

  imgs.forEach((img, i) => {
    if (i >= cols*rows) return;
    const col = i % cols, row = Math.floor(i/cols);
    const mesh = buildPhotoPlane(img.src, w, h);
    mesh.position.set(sX+col*gX, sY-row*gY, -7.85);
    mesh.userData = { zone:'contact', imgIndex:i, label:PRODUCT_ZONES.contact.label };
    drPhotoMeshes.push(mesh);
    drScene.add(mesh);

    // Pin in each corner
    [-w/2+0.04, w/2-0.04].forEach(px => {
      [-h/2+0.04, h/2-0.04].forEach(py => {
        const pin = drModelCache['pin'] ? drModelCache['pin'].clone(true) : null;
        if (pin) {
          pin.scale.setScalar(0.004);
          pin.position.set(sX+col*gX+px, sY-row*gY+py, -7.82);
          pin.rotation.x = Math.PI/2;
          drScene.add(pin);
        }
      });
    });
  });
}

function buildDryingLine() {
  const imgs = PRODUCT_ZONES.line.images;
  const spacing = 1.8, sX = -((imgs.length-1)*spacing)/2;
  const rots = [-0.06, 0.04, -0.03, 0.05, -0.04];

  imgs.forEach((img, i) => {
    const mesh = buildPhotoPlane(img.src, 0.7, 1.05);
    mesh.position.set(sX+i*spacing, 1.7, -0.3+rots[i%rots.length]*0.5);
    mesh.rotation.z = rots[i%rots.length];
    mesh.userData = { zone:'line', imgIndex:i, label:PRODUCT_ZONES.line.label };
    drPhotoMeshes.push(mesh);
    drScene.add(mesh);

    // Paper clip at top
    const clip = drModelCache['clip'] ? drModelCache['clip'].clone(true) : null;
    if (clip) {
      clip.scale.setScalar(0.015);
      clip.position.set(sX+i*spacing, 2.26, -0.3);
      clip.rotation.z = rots[i%rots.length];
      drScene.add(clip);
    }

    // Thin string from wire to clip
    const pts = [
      new THREE.Vector3(sX+i*spacing, 2.5, -0.3),
      new THREE.Vector3(sX+i*spacing, 2.28, -0.3)
    ];
    drScene.add(new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(pts),
      new THREE.LineBasicMaterial({color:0x333333})
    ));
  });
}

function buildEnlargerBaseboard() {
  const imgs = PRODUCT_ZONES.enlarger.images;
  // Photos laid flat on enlarger baseboard under the lens
  const positions = [[0,-0.22],[-.25,0.2],[.25,0.2],[-0.1,-0.05],[0.2,-0.1]];
  const rots = [0, 0.12, -0.08, 0.06, -0.10];
  imgs.forEach((img, i) => {
    if (i >= positions.length) return;
    const mesh = buildPhotoPlane(img.src, 0.65, 0.5);
    mesh.rotation.x = -Math.PI/2;
    mesh.rotation.z = rots[i];
    mesh.position.set(2.8+positions[i][0], -2.05, -1.5+positions[i][1]);
    mesh.userData = { zone:'enlarger', imgIndex:i, label:PRODUCT_ZONES.enlarger.label };
    drPhotoMeshes.push(mesh);
    drScene.add(mesh);
  });
}

function buildSideWallPrints() {
  const imgs = PRODUCT_ZONES.wall.images;
  const cols=3, rows=3, w=1.0, h=0.82, gX=1.12, gY=0.98;
  const sZ = -((cols-1)*gX)/2;
  const sY = 1.5;

  imgs.forEach((img, i) => {
    if (i >= cols*rows) return;
    const col = i%cols, row = Math.floor(i/cols);
    const mesh = buildPhotoPlane(img.src, w, h);
    mesh.rotation.y = Math.PI/2;
    mesh.rotation.z = (Math.random()-0.5)*0.04;
    mesh.position.set(-8.8, sY-row*gY, sZ+col*gX);
    mesh.userData = { zone:'wall', imgIndex:i, label:PRODUCT_ZONES.wall.label };
    drPhotoMeshes.push(mesh);
    drScene.add(mesh);

    // Pin
    const pin = drModelCache['pin'] ? drModelCache['pin'].clone(true) : null;
    if (pin) {
      pin.scale.setScalar(0.005);
      pin.position.set(-8.75, sY-row*gY+h/2-0.08, sZ+col*gX);
      pin.rotation.z = Math.PI/2; pin.rotation.x = Math.PI/4;
      drScene.add(pin);
    }
  });
}

function buildPinboard() {
  // Cork board above contact sheet
  const board = new THREE.Mesh(
    new THREE.BoxGeometry(5.5, 1.8, 0.06),
    new THREE.MeshStandardMaterial({ color:0x2a1a0a, roughness:0.95, metalness:0.0 })
  );
  board.position.set(0, 2.6, -7.82);
  board.receiveShadow=true; drScene.add(board);
}

/* ── Procedural props ── */
function buildTongs(x, y, z, rot) {
  const mat = new THREE.MeshStandardMaterial({ color:0x111111, roughness:0.5, metalness:0.7 });
  const armGeo = new THREE.BoxGeometry(0.018, 0.28, 0.012);
  [-0.018, 0.018].forEach(ox => {
    const arm = new THREE.Mesh(armGeo, mat);
    arm.position.set(x+ox, y, z);
    arm.rotation.z = ox > 0 ? -0.18 : 0.18;
    arm.castShadow=true; drScene.add(arm);
  });
  // Pivot
  const piv = new THREE.Mesh(new THREE.CylinderGeometry(0.012,0.012,0.025,8), mat);
  piv.rotation.z = Math.PI/2; piv.position.set(x, y+0.1, z);
  drScene.add(piv);
}

function buildSqueegee(x, y, z) {
  const mat = new THREE.MeshStandardMaterial({ color:0x0d0d0d, roughness:0.8, metalness:0.1 });
  // Handle
  const h = new THREE.Mesh(new THREE.CylinderGeometry(0.018,0.018,0.45,10), mat);
  h.position.set(x, y+0.1, z); h.rotation.z=0.3; h.castShadow=true; drScene.add(h);
  // Rubber blade
  const blade = new THREE.Mesh(new THREE.BoxGeometry(0.28,0.028,0.012),
    new THREE.MeshStandardMaterial({color:0x050505, roughness:0.95}));
  blade.position.set(x-0.12, y-0.06, z); drScene.add(blade);
}

/* ── Generic photo plane (paper-like) ── */
function buildPhotoPlane(src, w, h) {
  // Slightly off-white paper front
  const mat = new THREE.MeshStandardMaterial({
    color: 0x1a0a08, roughness:0.85, metalness:0.0,
    transparent:true, opacity:0.9
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  mesh.castShadow = true;

  // Load texture
  drTextureLoader.load(src, tex => {
    tex.minFilter = THREE.LinearFilter; tex.generateMipmaps=false;
    mesh.material = new THREE.MeshStandardMaterial({
      map: tex, color:0xfff0ee, roughness:0.82, metalness:0.0,
      transparent:true, opacity:0.0
    });
    const start=Date.now();
    (function fade(){
      const t=(Date.now()-start)/2200;
      mesh.material.opacity=Math.min(t,0.92);
      if(t<1) requestAnimationFrame(fade);
    })();
  }, undefined, ()=>{});

  return mesh;
}

/* ── Camera travel ── */
function navigateToZone(idx) {
  idx = Math.max(0, Math.min(ZONE_ORDER.length-1, idx));
  if (idx === currentZoneIdx && !drCamTraveling) return;
  currentZoneIdx = idx;
  drCamTargetT   = zoneT(idx);
  drCamTraveling = true;

  // Dust datamosh — whisper of the fashion gallery during transition
  if (typeof triggerGLGlitch === 'function') triggerGLGlitch(120);

  // Update dots
  document.querySelectorAll('.dr-zone-dot').forEach((d,i)=>d.classList.toggle('active',i===idx));

  // Show zone label
  const label = document.getElementById('darkroom-label');
  if (label) {
    label.textContent = PRODUCT_ZONES[ZONE_ORDER[idx]].label;
    label.style.opacity = '1';
    setTimeout(()=>{ label.style.opacity='0'; }, 2500);
  }
}

/* ── Mouse/touch ── */
function onDrMouseMove(e) {
  if (!isDarkroomOpen) return;
  drTargetParaX = ((e.clientX/window.innerWidth)*2-1)*0.8;
  drTargetParaY = -((e.clientY/window.innerHeight)*2-1)*0.4;
  drMouse.set((e.clientX/window.innerWidth)*2-1, -((e.clientY/window.innerHeight)*2-1));
}

let drTouchStartX=0, drTouchStartY=0;
function onDrTouchStart(e){ drTouchStartX=e.touches[0].clientX; drTouchStartY=e.touches[0].clientY; }
function onDrTouchMove(e){
  if(!isDarkroomOpen)return;
  drTargetParaX=((e.touches[0].clientX/window.innerWidth)*2-1)*0.6;
  drTargetParaY=-((e.touches[0].clientY/window.innerHeight)*2-1)*0.3;
}
function onDrTouchEnd(e){
  if(!isDarkroomOpen)return;
  const dx=e.changedTouches[0].clientX-drTouchStartX;
  const dy=e.changedTouches[0].clientY-drTouchStartY;
  if(Math.abs(dx)>Math.abs(dy)&&Math.abs(dx)>40) navigateToZone(currentZoneIdx+(dx<0?1:-1));
}
function onDrWheel(e){ if(!isDarkroomOpen)return; e.preventDefault(); navigateToZone(currentZoneIdx+(e.deltaY>0?1:-1)); }

function onDrClick(e){
  if(!isDarkroomOpen||!drHovered)return;
  const {zone,imgIndex}=drHovered.userData;
  if(zone!=null&&imgIndex!=null) openDarkroomViewer(zone,imgIndex);
}

/* ── Viewer ── */
function openDarkroomViewer(zone, idx) {
  drViewerZone=zone; drViewerIdx=idx;
  const imgs=PRODUCT_ZONES[zone].images;
  const viewer=document.getElementById('darkroom-viewer');
  const img=document.getElementById('darkroom-viewer-img');
  const meta=document.getElementById('darkroom-viewer-meta');
  img.src=imgs[idx].src; img.alt=imgs[idx].alt;
  // Re-trigger develop animation
  img.style.animation='none'; img.offsetHeight;
  img.style.animation='dr-develop 1.2s ease forwards';
  meta.textContent=`${PRODUCT_ZONES[zone].label} // ${idx+1} / ${imgs.length}`;
  viewer.classList.add('active');
}
function closeDarkroomViewer(){
  document.getElementById('darkroom-viewer').classList.remove('active');
}
document.getElementById('darkroom-viewer-prev').addEventListener('click',()=>{
  if(!drViewerZone)return;
  const l=PRODUCT_ZONES[drViewerZone].images.length;
  openDarkroomViewer(drViewerZone,(drViewerIdx-1+l)%l);
});
document.getElementById('darkroom-viewer-next').addEventListener('click',()=>{
  if(!drViewerZone)return;
  const l=PRODUCT_ZONES[drViewerZone].images.length;
  openDarkroomViewer(drViewerZone,(drViewerIdx+1)%l);
});

/* ── Render loop ── */
let drTime=0;
function darkroomRenderLoop(){
  if(!isDarkroomOpen)return;
  drAnimFrame=requestAnimationFrame(darkroomRenderLoop);
  drTime += 0.016;

  // Update liquid shader time
  drLiquidMeshes.forEach(m=>{ if(m.material.uniforms) m.material.uniforms.uTime.value=drTime; });

  // Smooth parallax
  drParallaxX+=(drTargetParaX-drParallaxX)*0.04;
  drParallaxY+=(drTargetParaY-drParallaxY)*0.04;

  if(drCamTraveling){
    // Move camera along spline toward target
    drCamPathT+=(drCamTargetT-drCamPathT)*0.025;
    if(Math.abs(drCamPathT-drCamTargetT)<0.001){
      drCamPathT=drCamTargetT;
      drCamTraveling=false;
    }
    const pos=drSpline.getPointAt(drCamPathT);
    drCamera.position.copy(pos);
    // Blend lookAt between zones during travel
    const zone=PRODUCT_ZONES[ZONE_ORDER[currentZoneIdx]];
    drCamera.lookAt(zone.cameraLookAt);
  } else {
    // Subtle parallax offset when stationary
    const zone=PRODUCT_ZONES[ZONE_ORDER[currentZoneIdx]];
    drCamera.position.copy(zone.cameraPos);
    drCamera.position.x+=drParallaxX*0.3;
    drCamera.position.y+=drParallaxY*0.2;
    drCamera.lookAt(
      zone.cameraLookAt.x+drParallaxX*0.1,
      zone.cameraLookAt.y+drParallaxY*0.1,
      zone.cameraLookAt.z
    );
  }

  // Raycaster hover
  drRaycaster.setFromCamera(drMouse, drCamera);
  const hits=drRaycaster.intersectObjects(drPhotoMeshes,false);
  const canvas=document.getElementById('darkroom-canvas');
  if(hits.length>0){
    drHovered=hits[0].object;
    if(canvas) canvas.style.cursor='pointer';
  } else {
    drHovered=null;
    if(canvas) canvas.style.cursor='default';
  }

  drComposer.render();
}

/* ── Resize ── */
function onDrResize(){
  if(!drRenderer)return;
  drCamera.aspect=window.innerWidth/window.innerHeight;
  drCamera.updateProjectionMatrix();
  drRenderer.setSize(window.innerWidth,window.innerHeight);
  drComposer.setSize(window.innerWidth,window.innerHeight);
}

/* ── Mobile darkroom ── */
function buildMobileDarkroom(){
  const el=document.getElementById('darkroom-mobile');
  el.innerHTML='';
  ZONE_ORDER.forEach(zk=>{
    const z=PRODUCT_ZONES[zk];
    const sec=document.createElement('div'); sec.className='dr-mobile-zone';
    const lbl=document.createElement('span'); lbl.className='dr-mobile-zone-label';
    lbl.textContent=z.label; sec.appendChild(lbl);
    const photos=document.createElement('div'); photos.className='dr-mobile-photos';
    z.images.forEach((img,i)=>{
      const wrap=document.createElement('div'); wrap.className='dr-mobile-photo';
      const im=document.createElement('img'); im.src=img.src; im.alt=img.alt; im.loading='lazy';
      wrap.addEventListener('click',()=>openDarkroomViewer(zk,i));
      wrap.appendChild(im); photos.appendChild(wrap);
    });
    sec.appendChild(photos); el.appendChild(sec);
  });
  const obs=new IntersectionObserver(entries=>{
    entries.forEach(e=>{
      if(e.isIntersecting){ const i=e.target.querySelector('img'); if(i) setTimeout(()=>i.classList.add('developed'),60); obs.unobserve(e.target); }
    });
  },{threshold:0.12});
  el.querySelectorAll('.dr-mobile-photo').forEach(e=>obs.observe(e));
}

/* ── Main toggle ── */
async function toggleProductGallery(open){
  isDarkroomOpen=open;
  const page=document.getElementById('product-page');
  page.classList.toggle('active',open);
  document.body.style.overflow=open?'hidden':'auto';

  if(open){
    if(window.innerWidth<=768){
      buildMobileDarkroom();
    } else {
      initDarkroom();
      currentZoneIdx=0; drCamPathT=zoneT(0); drCamTargetT=zoneT(0); drCamTraveling=false;
      drParallaxX=0; drParallaxY=0; drTargetParaX=0; drTargetParaY=0;
      const canvas=document.getElementById('darkroom-canvas');
      canvas.addEventListener('mousemove',onDrMouseMove);
      canvas.addEventListener('click',onDrClick);
      canvas.addEventListener('touchstart',onDrTouchStart,{passive:true});
      canvas.addEventListener('touchmove',onDrTouchMove,{passive:true});
      canvas.addEventListener('touchend',onDrTouchEnd,{passive:true});
      canvas.addEventListener('wheel',onDrWheel,{passive:false});
      navigateToZone(0);
      // Build scene + load assets then start loop
      if(!drAssetsLoaded){
        darkroomRenderLoop(); // start rendering (shows loading screen)
        await buildDarkroomScene();
      }
      darkroomRenderLoop();
    }
  } else {
    if(drAnimFrame){ cancelAnimationFrame(drAnimFrame); drAnimFrame=null; }
    const canvas=document.getElementById('darkroom-canvas');
    canvas.removeEventListener('mousemove',onDrMouseMove);
    canvas.removeEventListener('click',onDrClick);
    canvas.removeEventListener('touchstart',onDrTouchStart);
    canvas.removeEventListener('touchmove',onDrTouchMove);
    canvas.removeEventListener('touchend',onDrTouchEnd);
    canvas.removeEventListener('wheel',onDrWheel);
    closeDarkroomViewer();
  }
}
/* ═══════════════════════════════════════════════════════
   TIME-OF-DAY MOOD SYSTEM — unchanged
════════════════════════════════════════════════════════ */
const MOODS = {
  dawn:      { label: 'DAWN_LIGHT',    heroFilter: 'brightness(0.6) saturate(0.5) hue-rotate(200deg)',    triggerFilter: 'grayscale(0.8) brightness(0.25) hue-rotate(180deg)', tint: 'rgba(30,60,120,0.08)' },
  morning:   { label: 'GOLDEN_HOUR',   heroFilter: 'brightness(1.1) saturate(1.3) sepia(0.25)',           triggerFilter: 'grayscale(0.4) brightness(0.35) sepia(0.3)',          tint: 'rgba(255,200,80,0.05)' },
  midday:    { label: 'MIDDAY_FLAT',   heroFilter: 'brightness(1.3) saturate(0.7) contrast(1.2)',         triggerFilter: 'grayscale(0.6) brightness(0.45) contrast(1.1)',       tint: 'rgba(255,255,240,0.04)' },
  afternoon: { label: 'AMBER_HOUR',    heroFilter: 'brightness(1.0) saturate(1.5) sepia(0.4) hue-rotate(-10deg)', triggerFilter: 'grayscale(0.2) brightness(0.4) sepia(0.4)', tint: 'rgba(200,100,20,0.06)' },
  night:     { label: 'NIGHT_MODE',    heroFilter: 'brightness(0.7) saturate(0.3) hue-rotate(220deg)',    triggerFilter: 'grayscale(1) brightness(0.2) hue-rotate(200deg)',     tint: 'rgba(10,10,40,0.12)' },
};
function getMood() {
  const h = new Date().getHours();
  if (h >= 5  && h < 8)  return 'dawn';
  if (h >= 8  && h < 12) return 'morning';
  if (h >= 12 && h < 15) return 'midday';
  if (h >= 15 && h < 19) return 'afternoon';
  return 'night';
}
function applyMood() {
  const mood = getMood(), cfg = MOODS[mood];
  const heroOverlay = document.getElementById('hero-overlay');
  if (heroOverlay) heroOverlay.style.filter = cfg.heroFilter;
  const fashionImg = document.getElementById('fashion-trigger-img');
  const productImg = document.getElementById('product-trigger-img');
  if (fashionImg) fashionImg.style.filter = cfg.triggerFilter;
  if (productImg) productImg.style.filter = cfg.triggerFilter;
  const moodLabel = document.getElementById('mood-label');
  if (moodLabel) moodLabel.textContent = cfg.label;
  document.body.dataset.mood = mood;
}
applyMood();
setInterval(applyMood, 60 * 1000);
