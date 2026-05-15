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
   DARKROOM v4 — David Langarica style
   3 zones, starts ZOOMED IN, full-screen 3D background,
   realistic water in tray, no establish shot
════════════════════════════════════════════════════════ */

/* ── Zone / image data — 3 zones (NO THREE calls at top level) ── */
const PRODUCT_ZONES = {
  ecommerce: {
    label: 'E-COMMERCE // WHITE BG',
    sublabel: 'Studio packshots & clean catalogue imagery',
    bgModel: 'tray',
    images: [
      { src: 'images/product-louis-philippe-sneaker-side-profile-studio-1.webp',  alt: 'LP sneaker side profile' },
      { src: 'images/product-louis-philippe-sneaker-sole-detail-studio-2.webp',   alt: 'LP sneaker sole detail' },
      { src: 'images/product-louis-philippe-tie-box-flatlay-studio-1.webp',       alt: 'LP tie box flatlay' },
      { src: 'images/product-louis-philippe-tie-set-pedestal-studio-2.webp',      alt: 'LP tie set pedestal' },
      { src: 'images/product-macclite-wok-overhead-blue-studio-1.webp',           alt: 'MACclite wok overhead' },
      { src: 'images/product-macclite-crepe-pan-side-profile-studio-3.webp',      alt: 'MACclite crepe pan' },
      { src: 'images/product-macclite-tawa-frontal-studio-4.webp',                alt: 'MACclite tawa frontal' },
      { src: 'images/product-visionexpress-frames-front-face-studio-3.webp',      alt: 'VisionExpress front' },
    ]
  },
  lifestyle: {
    label: 'LIFESTYLE // FOOD & CONTEXT',
    sublabel: 'Contextual product photography with food & styling',
    bgModel: 'enlarger',
    images: [
      { src: 'images/product-macclite-pan-kitchen-counter-lifestyle-6.webp',      alt: 'MACclite kitchen counter' },
      { src: 'images/product-macclite-tawa-overhead-burlap-lifestyle-7.webp',     alt: 'MACclite tawa burlap' },
      { src: 'images/product-macclite-wok-overhead-props-lifestyle-8.webp',       alt: 'MACclite wok props' },
      { src: 'images/product-macclite-pan-uttapam-food-styling-9.webp',           alt: 'MACclite uttapam food' },
      { src: 'images/product-woven-basket-forest-editorial-bangalore-1.webp',     alt: 'Woven basket forest' },
      { src: 'images/product-woven-basket-bougainvillea-lifestyle-bangalore-2.webp', alt: 'Woven basket bougainvillea' },
      { src: 'images/product-woven-tote-basket-dried-flowers-studio-3.webp',      alt: 'Woven tote dried flowers' },
      { src: 'images/product-woven-basket-overhead-citrus-4.webp',                alt: 'Woven overhead citrus' },
    ]
  },
  creative: {
    label: 'CREATIVE // PAN & EDITORIAL',
    sublabel: 'Pan shots, motion, and editorial work',
    bgModel: 'stopwatch',
    images: [
      { src: 'images/product-louis-philippe-sneaker-heel-suede-detail-3.webp',    alt: 'LP sneaker heel suede' },
      { src: 'images/product-louis-philippe-sneaker-toe-logo-macro-4.webp',       alt: 'LP sneaker toe logo' },
      { src: 'images/product-louis-philippe-sneaker-sole-bottom-studio-5.webp',   alt: 'LP sneaker sole bottom' },
      { src: 'images/product-louis-philippe-sneaker-pair-front-angle-6.webp',     alt: 'LP sneaker pair front' },
      { src: 'images/product-visionexpress-frames-lens-macro-detail-2.webp',      alt: 'VisionExpress macro' },
      { src: 'images/product-visionexpress-frames-temple-side-profile-4.webp',    alt: 'VisionExpress temple' },
      { src: 'images/product-woven-crossbody-bag-spotlight-studio-5.webp',        alt: 'Woven crossbody spotlight' },
      { src: 'images/product-natural-fibre-mat-table-setting-brass-7.webp',       alt: 'Natural fibre mat brass' },
    ]
  }
};

const ZONE_ORDER = ['ecommerce', 'lifestyle', 'creative'];

/* ── Model paths (only files that exist) ── */
const MODEL_PATHS = {
  enlarger:   'models/durst_enlarger_darkroom_asset.glb',
  table:      'models/wood_table_pbr_low-poly.glb',
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

/* ── Post-process shaders ── */
const VignetteShader = {
  uniforms: {
    tDiffuse:    { value: null },
    darkness:    { value: 0.9 },
    warmTint:    { value: 0.04 },
    hazeDensity: { value: 0.15 },
  },
  vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float darkness;
    uniform float warmTint;
    uniform float hazeDensity;
    varying vec2 vUv;
    void main(){
      vec4 c = texture2D(tDiffuse, vUv);
      vec2 uv = vUv*(1.0-vUv.yx);
      float vig = pow(uv.x*uv.y*16.0, 0.7);
      c.rgb *= mix(1.0-darkness*0.5, 1.0, vig);
      c.r = min(1.0, c.r + warmTint * 0.8);
      c.g = min(1.0, c.g + warmTint * 0.25);
      c.b = max(0.0, c.b - warmTint * 0.4);
      float haze = hazeDensity * (1.0 - vig) * 0.4;
      vec3 hazeColor = vec3(0.22, 0.10, 0.05);
      c.rgb = mix(c.rgb, hazeColor, haze);
      gl_FragColor = c;
    }
  `
};

/* ── Water surface shader for tray ── */
const WaterShader = {
  uniforms: {
    tNormal:    { value: null },
    uTime:      { value: 0 },
    uColor:     { value: null },   // set to new THREE.Color() inside initDarkroom
    uReflect:   { value: 0.7 },
  },
  vertexShader: `
    varying vec2 vUv;
    varying vec3 vWorldPos;
    void main(){
      vUv = uv;
      vWorldPos = (modelMatrix * vec4(position,1.0)).xyz;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D tNormal;
    uniform float uTime;
    uniform vec3 uColor;
    uniform float uReflect;
    varying vec2 vUv;
    varying vec3 vWorldPos;
    void main(){
      vec2 uv1 = vUv * 3.0 + vec2(uTime * 0.08, uTime * 0.06);
      vec2 uv2 = vUv * 5.0 - vec2(uTime * 0.05, uTime * 0.09);
      vec3 n1 = texture2D(tNormal, uv1).rgb * 2.0 - 1.0;
      vec3 n2 = texture2D(tNormal, uv2).rgb * 2.0 - 1.0;
      vec3 normal = normalize(n1 + n2);
      float ripple = normal.r * 0.15 + normal.g * 0.10;
      vec3 base = uColor;
      // Caustic shimmer
      float caus = pow(max(0.0, normal.b), 3.0) * 0.5;
      // Edge highlight
      float edge = smoothstep(0.42, 0.5, max(abs(vUv.x-0.5), abs(vUv.y-0.5)));
      float highlight = (1.0 - edge) * (0.12 + caus + ripple * 0.3);
      vec3 col = base + highlight * vec3(0.6, 0.75, 0.95);
      // Warm safelight reflection
      col += vec3(0.08, 0.02, 0.0) * (0.3 + ripple);
      gl_FragColor = vec4(col, 0.93);
    }
  `
};

/* ── Darkroom state ── */
let drRenderer, drScene, drCamera, drComposer;
let drAnimFrame = null;
let isDarkroomOpen = false;
let drInited = false;
let drAssetsLoaded = false;
let drTextureLoader, drGLTFLoader;
let drTextureCache = {};
let drModelCache = {};
let drWaterMeshes = [];
let drPhotoMeshes = [];
let drBgModels = {};   // zone → placed model group
let drHovered = null;
let drRaycaster, drMouse;
let drViewerZone = null, drViewerIdx = 0;

/* ── Scroll / camera state ── */
let currentZoneIdx = 0;
let drScrollT      = 0;
let drRenderT      = 0;
let drScrollY      = 0;
let drParallaxX    = 0, drParallaxY = 0;
let drTargetParaX  = 0, drTargetParaY = 0;
let drTime         = 0;
const DR_ZONE_SCROLL_PX = window.innerHeight || 700;

/* ── Zone visual per-zone bg ── */
// Each zone: the hero 3D model fills the screen as bg, photos float over it
// Camera starts extremely close (zoomed in) and slowly breathes

const ZONE_CAMERAS = {
  ecommerce: {
    // Zoomed in on water tray top-down — water fills screen
    start: { pos: [0, 1.8, 0.01], look: [0, 0, 0] },
    idle:  { pos: [0, 1.6, 0.02], look: [0, 0, 0] },
  },
  lifestyle: {
    // Zoomed into enlarger head
    start: { pos: [0, 0.45, 0.9], look: [0, 0.2, 0] },
    idle:  { pos: [0, 0.4, 0.85], look: [0, 0.2, 0] },
  },
  creative: {
    // Zoomed into stopwatch face
    start: { pos: [0, 0.5, 0.7], look: [0, 0, 0] },
    idle:  { pos: [0, 0.45, 0.65], look: [0, 0, 0] },
  },
};

/* ══ INIT ══ */
function initDarkroom() {
  if (drInited) return;
  drInited = true;

  const canvas = document.getElementById('darkroom-canvas');
  drRenderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
  drRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  drRenderer.setSize(window.innerWidth, window.innerHeight);
  drRenderer.shadowMap.enabled = true;
  drRenderer.shadowMap.type = THREE.PCFSoftShadowMap;
  drRenderer.toneMapping = THREE.ACESFilmicToneMapping;
  drRenderer.toneMappingExposure = 1.1;
  drRenderer.outputEncoding = THREE.sRGBEncoding;

  drScene = new THREE.Scene();
  drScene.background = new THREE.Color(0x050202);
  drScene.fog = new THREE.FogExp2(0x120504, 0.18);

  drCamera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.01, 50);
  // Start zoomed into ecommerce zone (tray) — no establish shot
  drCamera.position.set(0, 1.8, 0.01);
  drCamera.lookAt(0, 0, 0);

  drRaycaster = new THREE.Raycaster();
  drMouse     = new THREE.Vector2(-9, -9);

  drTextureLoader = new THREE.TextureLoader();
  drGLTFLoader    = new THREE.GLTFLoader();

  /* Post-processing */
  drComposer = new THREE.EffectComposer(drRenderer);
  drComposer.addPass(new THREE.RenderPass(drScene, drCamera));

  const bloom = new THREE.UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    0.65, 0.5, 0.78
  );
  drComposer.addPass(bloom);

  const film = new THREE.FilmPass(0.18, 0.03, 512, false);
  drComposer.addPass(film);

  const vig = new THREE.ShaderPass(VignetteShader);
  vig.renderToScreen = true;
  drComposer.addPass(vig);

  window.addEventListener('resize', onDrResize);
}

/* ══ LIGHTING ══ */
function buildLighting() {
  drScene.add(new THREE.AmbientLight(0x2a0a02, 2.5));

  // Primary warm safelight
  const safe = new THREE.PointLight(0xff3800, 20.0, 30, 1.5);
  safe.position.set(0, 5, 2);
  safe.castShadow = true;
  safe.shadow.mapSize.width = safe.shadow.mapSize.height = 1024;
  drScene.add(safe);

  // Fill cool rim
  const rim = new THREE.PointLight(0xff1800, 6.0, 15, 2);
  rim.position.set(-4, 3, -2);
  drScene.add(rim);

  // Top direct for clarity
  const top = new THREE.DirectionalLight(0xffd0a0, 1.8);
  top.position.set(1, 6, 2);
  top.castShadow = true;
  drScene.add(top);

  // Under-glow for tray
  const trayGlow = new THREE.PointLight(0xff6600, 4.0, 6, 2);
  trayGlow.position.set(0, -0.3, 0);
  drScene.add(trayGlow);
}

/* ══ BUILD SCENE ══ */
async function buildDarkroomScene() {
  buildLighting();
  await loadAllAssets();
  drAssetsLoaded = true;
}

async function loadAllAssets() {
  const loading = document.getElementById('dr-loading');
  const fill    = document.getElementById('dr-loading-fill');
  const sub     = document.getElementById('dr-loading-sub');

  const tasks = [
    // Water normals texture
    () => new Promise(res => {
      drTextureLoader.load(
        'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/textures/waternormals.jpg',
        tex => { tex.wrapS = tex.wrapT = THREE.RepeatWrapping; drTextureCache['waternormal'] = tex; res(); },
        undefined, res
      );
    }),
    // Load all models
    ...Object.entries(MODEL_PATHS).map(([key, path]) => () => new Promise(res => {
      drGLTFLoader.load(path, gltf => {
        gltf.scene.traverse(n => { if (n.isMesh) { n.castShadow = true; n.receiveShadow = true; } });
        drModelCache[key] = gltf.scene;
        res();
      }, undefined, () => res()); // don't fail on missing
    })),
  ];

  let done = 0;
  const total = tasks.length;
  for (const task of tasks) {
    await task();
    done++;
    const pct = Math.round((done / total) * 100);
    if (fill) fill.style.width = `${pct}%`;
    if (sub)  sub.textContent  = `INITIALISING // ${pct}%`;
  }

  placeAllZoneBgs();
  buildAllPhotos();

  if (loading) {
    loading.style.opacity = '0';
    setTimeout(() => { loading.classList.add('hidden'); }, 800);
  }

  const hint = document.getElementById('darkroom-hint');
  if (hint) { hint.classList.add('visible'); setTimeout(() => hint.classList.remove('visible'), 4000); }
}

/* ══ ZONE BACKGROUNDS — full-screen filling objects ══ */
function placeAllZoneBgs() {
  placeTrayBg();       // ecommerce zone
  placeEnlargerBg();   // lifestyle zone
  placeStopwatchBg();  // creative zone
}

function autoScaleToFit(model, targetSize) {
  const box = new THREE.Box3().setFromObject(model);
  const size = new THREE.Vector3();
  box.getSize(size);
  const maxDim = Math.max(size.x, size.y, size.z);
  if (maxDim > 0) model.scale.setScalar(targetSize / maxDim);
}

/* ZONE 0: Water Tray — fills camera from above, camera looks straight down */
function placeTrayBg() {
  if (!drModelCache['tray']) return;
  const group = new THREE.Group();

  // Large tray centred at origin, scaled so it fills the view from y=1.8 looking down
  // Camera is at y=1.8 looking at 0,0,0 — tray should appear huge
  const tray = drModelCache['tray'].clone(true);
  autoScaleToFit(tray, 3.2);
  const trayBox = new THREE.Box3().setFromObject(tray);
  const trayCenter = new THREE.Vector3();
  trayBox.getCenter(trayCenter);
  tray.position.set(-trayCenter.x, -trayCenter.y, -trayCenter.z);
  group.add(tray);

  // Realistic water plane inside tray
  if (drTextureCache['waternormal']) {
    const waterGeo = new THREE.PlaneGeometry(2.4, 2.4, 32, 32);
    const waterMat = new THREE.ShaderMaterial({
      uniforms: {
        tNormal:  { value: drTextureCache['waternormal'] },
        uTime:    { value: 0 },
        uColor:   { value: new THREE.Color(0.03, 0.06, 0.10) },
        uReflect: { value: 0.8 },
      },
      vertexShader: WaterShader.vertexShader,
      fragmentShader: WaterShader.fragmentShader,
      transparent: true,
      side: THREE.FrontSide,
    });
    const waterPlane = new THREE.Mesh(waterGeo, waterMat);
    waterPlane.rotation.x = -Math.PI / 2;
    waterPlane.position.y = 0.04; // slightly above tray floor
    drWaterMeshes.push(waterPlane);
    group.add(waterPlane);

    // Caustic light shimmer from below water
    const causticLight = new THREE.PointLight(0x4080ff, 3.0, 4, 2);
    causticLight.position.set(0, -0.5, 0);
    group.add(causticLight);
  }

  group.userData.zone = 'ecommerce';
  group.userData.isZoneBg = true;
  // Position: at origin, camera at y=1.8 looks down
  group.position.set(0, 0, 0);
  drScene.add(group);
  drBgModels['ecommerce'] = group;
}

/* ZONE 1: Enlarger — fills frame, camera close up */
function placeEnlargerBg() {
  if (!drModelCache['enlarger']) return;
  const group = new THREE.Group();

  const enlarger = drModelCache['enlarger'].clone(true);
  autoScaleToFit(enlarger, 2.8);
  const box = new THREE.Box3().setFromObject(enlarger);
  const center = new THREE.Vector3();
  box.getCenter(center);
  enlarger.position.set(-center.x, -center.y, -center.z);
  group.add(enlarger);

  // Add table below enlarger
  if (drModelCache['table']) {
    const table = drModelCache['table'].clone(true);
    autoScaleToFit(table, 1.0);
    table.position.set(0, -1.4, 0);
    group.add(table);
  }

  // Add chemistry props
  if (drModelCache['flask']) {
    const flask = drModelCache['flask'].clone(true);
    autoScaleToFit(flask, 0.18);
    flask.position.set(-0.5, -0.8, 0.3);
    group.add(flask);
  }
  if (drModelCache['funnel']) {
    const funnel = drModelCache['funnel'].clone(true);
    autoScaleToFit(funnel, 0.12);
    funnel.position.set(0.4, -0.85, 0.25);
    group.add(funnel);
  }

  // Enlarger beam spotlight
  const beam = new THREE.SpotLight(0xfff0d0, 50, 4, Math.PI / 10, 0.2, 1.8);
  beam.position.set(0, 0.4, 0);
  beam.target.position.set(0, -2, 0);
  group.add(beam);
  group.add(beam.target);

  group.userData.zone = 'lifestyle';
  group.userData.isZoneBg = true;
  group.position.set(0, 0, 0);
  drScene.add(group);
  drBgModels['lifestyle'] = group;
  group.visible = false;
}

/* ZONE 2: Stopwatch — fills frame */
function placeStopwatchBg() {
  if (!drModelCache['stopwatch']) return;
  const group = new THREE.Group();

  const watch = drModelCache['stopwatch'].clone(true);
  autoScaleToFit(watch, 2.2);
  const box = new THREE.Box3().setFromObject(watch);
  const center = new THREE.Vector3();
  box.getCenter(center);
  watch.position.set(-center.x, -center.y, -center.z);
  watch.rotation.x = -0.3; // slight tilt
  group.add(watch);

  // Scattered props
  if (drModelCache['clip']) {
    [-0.6, 0.7].forEach((x, i) => {
      const clip = drModelCache['clip'].clone(true);
      autoScaleToFit(clip, 0.25);
      clip.position.set(x, -0.6, 0.2 * (i - 0.5));
      clip.rotation.z = (i - 0.5) * 0.4;
      group.add(clip);
    });
  }

  if (drModelCache['polaroid']) {
    const pol = drModelCache['polaroid'].clone(true);
    autoScaleToFit(pol, 0.4);
    pol.position.set(0.8, -0.5, -0.3);
    pol.rotation.z = 0.3;
    group.add(pol);
  }

  group.userData.zone = 'creative';
  group.userData.isZoneBg = true;
  group.position.set(0, 0, 0);
  drScene.add(group);
  drBgModels['creative'] = group;
  group.visible = false;
}

/* ══ PHOTOS — floating over the bg in a grid/arc ══ */
function buildAllPhotos() {
  buildZonePhotos('ecommerce');
  buildZonePhotos('lifestyle');
  buildZonePhotos('creative');
}

function buildZonePhotos(zoneName) {
  const zone = PRODUCT_ZONES[zoneName];
  const imgs = zone.images;
  const count = imgs.length;

  // Arc arrangement floating in space
  const radius = 1.4;
  const angleStep = (Math.PI * 1.2) / Math.max(count - 1, 1);
  const startAngle = -Math.PI * 0.6;

  imgs.forEach((img, i) => {
    const angle = startAngle + i * angleStep;
    const x = Math.sin(angle) * radius;
    const y = -0.1 + Math.cos(angle * 0.5) * 0.3;
    const z = -0.5 - Math.cos(angle) * 0.4;

    const w = 0.55, h = 0.42;
    const mesh = buildPhotoPlane(img.src, w, h);
    mesh.position.set(x, y, z);
    // Face camera with slight curve
    mesh.rotation.y = -angle * 0.3;
    mesh.userData = { zone: zoneName, imgIndex: i, label: zone.label };
    mesh.userData.basePos = new THREE.Vector3(x, y, z);
    mesh.userData.baseRot = mesh.rotation.y;
    drPhotoMeshes.push(mesh);
    drScene.add(mesh);

    // Photos hidden initially, zone switching shows/hides
    mesh.userData.zoneName = zoneName;
    mesh.visible = (zoneName === 'ecommerce');
  });
}

function buildPhotoPlane(src, w, h) {
  const mat = new THREE.MeshStandardMaterial({
    color: 0x1a0a08, roughness: 0.8, metalness: 0.0,
    transparent: true, opacity: 0.9
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  mesh.castShadow = true;

  drTextureLoader.load(src, tex => {
    tex.minFilter = THREE.LinearFilter;
    tex.generateMipmaps = false;
    mesh.material = new THREE.MeshStandardMaterial({
      map: tex, color: 0xfff0ee, roughness: 0.78, metalness: 0.0,
      transparent: true, opacity: 0.0
    });
    const start = Date.now();
    (function fade() {
      const t = (Date.now() - start) / 1800;
      mesh.material.opacity = Math.min(t, 0.95);
      if (t < 1) requestAnimationFrame(fade);
    })();
  }, undefined, () => {});

  return mesh;
}

/* ══ ZONE SWITCHING ══ */
let drZoneTransitioning = false;

function switchZone(newIdx) {
  if (newIdx === currentZoneIdx) return;
  const oldZone = ZONE_ORDER[currentZoneIdx];
  const newZone = ZONE_ORDER[newIdx];
  currentZoneIdx = newIdx;

  // Swap bg models
  Object.entries(drBgModels).forEach(([zone, group]) => {
    group.visible = (zone === newZone);
  });

  // Swap photos
  drPhotoMeshes.forEach(m => {
    m.visible = (m.userData.zoneName === newZone);
  });

  // Move camera to new zone start (zoomed in, no establish)
  const cam = ZONE_CAMERAS[newZone];
  // Instantly snap then let render loop smooth it
  drCamera.position.set(...cam.start.pos);
  drCamera.lookAt(...cam.start.look);

  updateZoneUI(newIdx);
  if (typeof triggerGLGlitch === 'function') triggerGLGlitch(120);
}

/* ══ RENDER LOOP ══ */
function darkroomRenderLoop() {
  if (!isDarkroomOpen) return;
  drAnimFrame = requestAnimationFrame(darkroomRenderLoop);
  drTime += 0.016;

  // Animate water
  drWaterMeshes.forEach(m => {
    if (m.material.uniforms) m.material.uniforms.uTime.value = drTime;
  });

  // Smooth parallax
  drParallaxX += (drTargetParaX - drParallaxX) * 0.04;
  drParallaxY += (drTargetParaY - drParallaxY) * 0.04;

  // Smooth scrollT
  drRenderT += (drScrollT - drRenderT) * 0.06;

  // Camera: zone-based, always zoomed in
  const zoneF    = drRenderT * (ZONE_ORDER.length - 1);
  const zIdx     = Math.max(0, Math.min(ZONE_ORDER.length - 1, Math.round(zoneF)));
  const zName    = ZONE_ORDER[zIdx];
  const cam      = ZONE_CAMERAS[zName];

  if (cam) {
    // Idle breath
    const breath = Math.sin(drTime * 0.4) * 0.012;
    const tx = cam.idle.pos[0] + drParallaxX * 0.06;
    const ty = cam.idle.pos[1] + drParallaxY * 0.04 + breath;
    const tz = cam.idle.pos[2];

    drCamera.position.x += (tx - drCamera.position.x) * 0.025;
    drCamera.position.y += (ty - drCamera.position.y) * 0.025;
    drCamera.position.z += (tz - drCamera.position.z) * 0.025;

    const lx = cam.idle.look[0] + drParallaxX * 0.03;
    const ly = cam.idle.look[1] + drParallaxY * 0.02;
    drCamera.lookAt(lx, ly, cam.idle.look[2]);
  }

  // Float photos gently
  drPhotoMeshes.forEach((m, i) => {
    if (!m.visible) return;
    const basePos = m.userData.basePos;
    if (!basePos) return;
    const phase = i * 0.7 + drTime * 0.25;
    m.position.y = basePos.y + Math.sin(phase) * 0.018;
    m.position.x = basePos.x + Math.cos(phase * 0.6) * 0.008;
  });

  // Hover highlight
  drRaycaster.setFromCamera(drMouse, drCamera);
  const hits = drRaycaster.intersectObjects(drPhotoMeshes.filter(m => m.visible), false);
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

/* ══ SCROLL SYSTEM ══ */
let drScrollBound = null;
let drTouchBound  = { start: null, move: null };
let _drTouchStartY = 0;

function onDrPageScroll(e) {
  e.preventDefault();
  const delta = e.deltaY || 0;
  drScrollY = Math.max(0, Math.min(
    drScrollY + delta,
    DR_ZONE_SCROLL_PX * (ZONE_ORDER.length - 1)
  ));
  drScrollT = drScrollY / (DR_ZONE_SCROLL_PX * (ZONE_ORDER.length - 1));

  const newIdx = Math.min(ZONE_ORDER.length - 1, Math.round(drScrollT * (ZONE_ORDER.length - 1)));
  if (newIdx !== currentZoneIdx) switchZone(newIdx);
}

function onDrTouchStart(e) { _drTouchStartY = e.touches[0].clientY; }
function onDrTouchMove(e) {
  e.preventDefault();
  const dy = _drTouchStartY - e.touches[0].clientY;
  drScrollY = Math.max(0, Math.min(
    drScrollY + dy * 1.6,
    DR_ZONE_SCROLL_PX * (ZONE_ORDER.length - 1)
  ));
  _drTouchStartY = e.touches[0].clientY;
  drScrollT = drScrollY / (DR_ZONE_SCROLL_PX * (ZONE_ORDER.length - 1));
  const newIdx = Math.min(ZONE_ORDER.length - 1, Math.round(drScrollT * (ZONE_ORDER.length - 1)));
  if (newIdx !== currentZoneIdx) switchZone(newIdx);
}

function attachScrollHijack() {
  const page = document.getElementById('product-page');
  drScrollBound = onDrPageScroll.bind(null);
  drTouchBound.start = onDrTouchStart.bind(null);
  drTouchBound.move  = onDrTouchMove.bind(null);
  page.addEventListener('wheel',      drScrollBound,    { passive: false });
  page.addEventListener('touchstart', drTouchBound.start, { passive: true });
  page.addEventListener('touchmove',  drTouchBound.move,  { passive: false });
}

function detachScrollHijack() {
  const page = document.getElementById('product-page');
  if (drScrollBound)    page.removeEventListener('wheel',      drScrollBound);
  if (drTouchBound.start) page.removeEventListener('touchstart', drTouchBound.start);
  if (drTouchBound.move)  page.removeEventListener('touchmove',  drTouchBound.move);
  drScrollBound = null; drTouchBound.start = null; drTouchBound.move = null;
}

/* ══ MOUSE ══ */
function onDrMouseMove(e) {
  drTargetParaX = ((e.clientX / window.innerWidth)  * 2 - 1) *  0.6;
  drTargetParaY = -((e.clientY / window.innerHeight) * 2 - 1) * 0.3;
  drMouse.set((e.clientX / window.innerWidth) * 2 - 1, -((e.clientY / window.innerHeight) * 2 - 1));
}

function onDrClick(e) {
  if (!isDarkroomOpen || !drHovered) return;
  const { zone, imgIndex } = drHovered.userData;
  if (zone != null && imgIndex != null) openDarkroomViewer(zone, imgIndex);
}

/* ══ VIEWER ══ */
function openDarkroomViewer(zone, idx) {
  drViewerZone = zone; drViewerIdx = idx;
  const imgs = PRODUCT_ZONES[zone].images;
  const viewer = document.getElementById('darkroom-viewer');
  const img    = document.getElementById('darkroom-viewer-img');
  const meta   = document.getElementById('darkroom-viewer-meta');
  img.src = imgs[idx].src; img.alt = imgs[idx].alt;
  img.style.animation = 'none'; img.offsetHeight;
  img.style.animation = 'dr-develop 1.2s ease forwards';
  meta.textContent = `${PRODUCT_ZONES[zone].label} // ${idx + 1} / ${imgs.length}`;
  viewer.classList.add('active');
}

function closeDarkroomViewer() {
  document.getElementById('darkroom-viewer').classList.remove('active');
}

document.getElementById('darkroom-viewer-prev').addEventListener('click', () => {
  if (!drViewerZone) return;
  const l = PRODUCT_ZONES[drViewerZone].images.length;
  openDarkroomViewer(drViewerZone, (drViewerIdx - 1 + l) % l);
});
document.getElementById('darkroom-viewer-next').addEventListener('click', () => {
  if (!drViewerZone) return;
  const l = PRODUCT_ZONES[drViewerZone].images.length;
  openDarkroomViewer(drViewerZone, (drViewerIdx + 1) % l);
});

/* ══ ZONE UI ══ */
function updateZoneUI(idx) {
  document.querySelectorAll('.dr-zone-dot').forEach((d, i) => d.classList.toggle('active', i === idx));
  const zoneData = PRODUCT_ZONES[ZONE_ORDER[idx]];
  const label = document.getElementById('darkroom-label');
  if (label) {
    label.textContent = zoneData.label;
    label.style.opacity = '1';
    setTimeout(() => { label.style.opacity = '0'; }, 2800);
  }
  const sublabel = document.getElementById('darkroom-sublabel');
  if (sublabel) {
    sublabel.textContent = zoneData.sublabel || '';
  }
  // Update zone pills
  document.querySelectorAll('.dr-zone-pill').forEach((el, i) => {
    el.classList.toggle('active', i === idx);
  });
}

/* ══ RESIZE ══ */
function onDrResize() {
  if (!drRenderer) return;
  drCamera.aspect = window.innerWidth / window.innerHeight;
  drCamera.updateProjectionMatrix();
  drRenderer.setSize(window.innerWidth, window.innerHeight);
  drComposer.setSize(window.innerWidth, window.innerHeight);
}

/* ══ MAIN TOGGLE ══ */
async function toggleProductGallery(open) {
  isDarkroomOpen = open;
  const page = document.getElementById('product-page');
  page.classList.toggle('active', open);
  document.body.style.overflow = open ? 'hidden' : 'auto';

  if (open) {
    initDarkroom();

    if (window.innerWidth <= 900) {
      drRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 1));
    }

    // Reset
    drScrollY = 0; drScrollT = 0; drRenderT = 0;
    currentZoneIdx = 0; drParallaxX = 0; drParallaxY = 0;
    drTargetParaX = 0; drTargetParaY = 0;

    const canvas = document.getElementById('darkroom-canvas');
    if (canvas) canvas.style.display = 'block';
    canvas.addEventListener('mousemove', onDrMouseMove);
    canvas.addEventListener('click',     onDrClick);

    // STARTS ZOOMED IN — ecommerce (water tray) zone, no establish shot
    drCamera.position.set(0, 1.8, 0.01);
    drCamera.lookAt(0, 0, 0);

    attachScrollHijack();
    updateZoneUI(0);

    if (!drAssetsLoaded) {
      darkroomRenderLoop();
      await buildDarkroomScene();
    } else {
      // Reset visibility
      Object.entries(drBgModels).forEach(([z, g]) => { g.visible = (z === 'ecommerce'); });
      drPhotoMeshes.forEach(m => { m.visible = (m.userData.zoneName === 'ecommerce'); });
      darkroomRenderLoop();
    }

  } else {
    if (drAnimFrame) { cancelAnimationFrame(drAnimFrame); drAnimFrame = null; }
    const canvas = document.getElementById('darkroom-canvas');
    canvas.removeEventListener('mousemove', onDrMouseMove);
    canvas.removeEventListener('click',     onDrClick);
    detachScrollHijack();
    closeDarkroomViewer();
  }
}

/* ── Pill click handler ── */
function drPillClick(idx) {
  if (!isDarkroomOpen) return;
  // Jump scroll to that zone
  drScrollY = idx * DR_ZONE_SCROLL_PX;
  drScrollT = idx / (ZONE_ORDER.length - 1);
  if (idx !== currentZoneIdx) switchZone(idx);
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
