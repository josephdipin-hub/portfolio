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
   v3 — scroll-driven camera (David Langarica style),
   stylized cinematic lighting, atmospheric haze,
   corrected prop placement, mobile 3D scene.
════════════════════════════════════════════════════════ */

/* ── Zone / image data ── */
const PRODUCT_ZONES = {
  tray: {
    label: 'WOVEN // NATURAL FIBRE',
    cameraPos:    new THREE.Vector3(-2.2, 0.3, 3.2),
    cameraLookAt: new THREE.Vector3(-2.2, -1.0, -1.5),
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
    cameraPos:    new THREE.Vector3(0.5, 1.4, 4.5),
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
    cameraPos:    new THREE.Vector3(0.5, 2.6, 3.5),
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
    cameraPos:    new THREE.Vector3(2.8, 0.5, 3.5),
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
    cameraPos:    new THREE.Vector3(-4.2, 0.5, 3.2),
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

/* ── Model paths ── */
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

/* ── Atmospheric haze + vignette + warm grade ── */
const VignetteShader = {
  uniforms: {
    tDiffuse:  { value: null },
    darkness:  { value: 1.2 },
    warmTint:  { value: 0.06 },
    hazeDensity: { value: 0.28 },
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
      // Vignette
      vec2 uv = vUv*(1.0-vUv.yx);
      float vig = pow(uv.x*uv.y*16.0, 0.85);
      c.rgb *= mix(1.0-darkness*0.4, 1.0, vig);
      // Warm cinematic grade — push orange, kill blue slightly
      c.r = min(1.0, c.r + warmTint * 0.9);
      c.g = min(1.0, c.g + warmTint * 0.3);
      c.b = max(0.0, c.b - warmTint * 0.5);
      // Atmospheric haze: blend toward warm fog near distance (brighter edges)
      float haze = hazeDensity * (1.0 - vig) * 0.5;
      vec3 hazeColor = vec3(0.28, 0.14, 0.08);
      c.rgb = mix(c.rgb, hazeColor, haze);
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
    uDevelop:  { value: 0 },
  },
  vertexShader: `
    varying vec2 vUv;
    void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }
  `,
  fragmentShader: `
    uniform sampler2D tPhoto;
    uniform sampler2D tNormal;
    uniform float uTime;
    uniform float uDevelop;
    varying vec2 vUv;
    void main(){
      vec2 n1 = texture2D(tNormal, vUv*1.5 + vec2(uTime*0.015, uTime*0.012)).rg * 2.0 - 1.0;
      vec2 n2 = texture2D(tNormal, vUv*2.2 - vec2(uTime*0.010, uTime*0.018)).rg * 2.0 - 1.0;
      vec2 distort = (n1+n2) * 0.008;
      vec4 photo = texture2D(tPhoto, vUv + distort * uDevelop);
      vec4 liquid = vec4(0.06, 0.03, 0.01, 0.88);
      float emerge = smoothstep(0.0, 1.0, uDevelop);
      vec2 cUv = vUv - 0.5;
      float highlight = pow(max(0.0, 1.0 - length(cUv)*2.5), 3.0) * 0.2;
      vec3 col = mix(liquid.rgb, photo.rgb, emerge * 0.92);
      col += highlight * vec3(0.9, 0.7, 0.5);
      float edge = smoothstep(0.0, 0.04, min(vUv.x, min(1.0-vUv.x, min(vUv.y, 1.0-vUv.y))));
      col *= edge;
      gl_FragColor = vec4(col, mix(0.85, 0.95, emerge));
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
let drLiquidMeshes = [];
let drPhotoMeshes  = [];
let drHovered = null;
let drRaycaster, drMouse;
let drViewerZone = null, drViewerIdx = 0;

/* ── Scroll-driven camera state ── */
let currentZoneIdx  = 0;
let drScrollT       = 0;    // 0–1 scroll position (drives camera)
let drRenderT       = 0;    // smoothed T for render
let drScrollY       = 0;    // internal pixel scroll accumulator
let drParallaxX     = 0, drParallaxY = 0;
let drTargetParaX   = 0, drTargetParaY = 0;

/* Scroll accumulator — each zone = one screen height of scroll */
const DR_ZONE_SCROLL_PX = window.innerHeight || 700; // pixels per zone

/* ── Camera spline ── */
let drSpline;

function buildCameraSpline() {
  const pts = ZONE_ORDER.map(k => PRODUCT_ZONES[k].cameraPos.clone());
  pts.unshift(pts[0].clone());
  pts.push(pts[pts.length-1].clone());
  drSpline = new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.5);
}

function zoneT(idx) {
  return (idx + 1) / (ZONE_ORDER.length + 1);
}

/* Map scroll T (0-1 over all zones) to spline T */
function scrollTtoSplineT(st) {
  // st: 0 = zone 0, 1 = zone ZONE_ORDER.length-1
  const zoneF = st * (ZONE_ORDER.length - 1);
  const lowerIdx = Math.max(0, Math.min(ZONE_ORDER.length - 2, Math.floor(zoneF)));
  const fraction = zoneF - lowerIdx;
  const t0 = zoneT(lowerIdx);
  const t1 = zoneT(lowerIdx + 1);
  return t0 + (t1 - t0) * fraction;
}

/* ── Init Three.js ── */
function initDarkroom() {
  if (!window.THREE || drInited) return;
  drInited = true;

  const canvas = document.getElementById('darkroom-canvas');

  drRenderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  drRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  drRenderer.setSize(window.innerWidth, window.innerHeight);
  drRenderer.setClearColor(0x030101, 1);
  drRenderer.toneMapping = THREE.ACESFilmicToneMapping;
  drRenderer.toneMappingExposure = 1.4;
  drRenderer.shadowMap.enabled = true;
  drRenderer.shadowMap.type = THREE.PCFSoftShadowMap;
  drRenderer.physicallyCorrectLights = true;

  drScene  = new THREE.Scene();
  // Atmospheric warm haze fog — not pitch black, but moody amber
  drScene.fog = new THREE.FogExp2(0x1a0802, 0.032);

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

  // Generous bloom — safelight halos bleed warmly
  const bloom = new THREE.UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    0.85, 0.65, 0.72
  );
  drComposer.addPass(bloom);

  // Film grain — subtle but present
  const film = new THREE.FilmPass(0.22, 0.04, 512, false);
  drComposer.addPass(film);

  // Atmospheric vignette + warm cinematic grade + haze
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
  // Richer wall colour — dark charcoal with warm undertone
  const wallMat  = new THREE.MeshStandardMaterial({ color:0x0e0603, roughness:0.94, metalness:0.0 });
  const floorMat = new THREE.MeshStandardMaterial({ color:0x080401, roughness:0.98, metalness:0.0 });

  [[0,0,-8,   0,0],
   [-9,0,0,   0, Math.PI/2],
   [9,0,0,    0,-Math.PI/2],
   [0,6,0,    Math.PI/2,0],
  ].forEach(([x,y,z,rx,ry]) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(30,14), wallMat);
    m.position.set(x,y,z); m.rotation.x=rx; m.rotation.y=ry||0;
    m.receiveShadow=true; drScene.add(m);
  });

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(30,30), floorMat);
  floor.rotation.x = -Math.PI/2; floor.position.y=-3.5;
  floor.receiveShadow=true; drScene.add(floor);

  const matMesh = new THREE.Mesh(
    new THREE.BoxGeometry(2.8, 0.03, 1.8),
    new THREE.MeshStandardMaterial({ color:0x050302, roughness:0.99 })
  );
  matMesh.position.set(2.8,-3.48,-1.5); drScene.add(matMesh);

  /* ── STYLIZED LIGHTING — cinematic, not realistic darkroom ── */

  // Rich warm ambient — never pure black
  drScene.add(new THREE.AmbientLight(0x2a0a02, 3.0));

  // PRIMARY SAFELIGHT — large warm orange-red, generous range
  const safe = new THREE.PointLight(0xff3800, 18.0, 28, 1.8);
  safe.position.set(-1, 5.5, 1.0);
  safe.castShadow=true;
  safe.shadow.mapSize.width = safe.shadow.mapSize.height = 1024;
  drScene.add(safe);

  // Safelight housing
  const shGeo = new THREE.CylinderGeometry(0.06, 0.22, 0.28, 12);
  const shMat = new THREE.MeshStandardMaterial({ color:0x1a1008, roughness:0.6, metalness:0.3 });
  const sh = new THREE.Mesh(shGeo, shMat);
  sh.position.set(-1, 5.75, 1.0); drScene.add(sh);
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.05,10,8),
    new THREE.MeshBasicMaterial({color:0xff5500}));
  bulb.position.set(-1, 5.58, 1.0); drScene.add(bulb);
  const cord = new THREE.Line(

/* ═════════════════════════════════════════════════════════
   PRODUCT GALLERY — GLB MODELS + RED NEON + PHOTO INTEGRATION
   Curated David Langarica style with proper 3D rendering
═════════════════════════════════════════════════════════ */

const PRODUCTS = {
  visionexpress: {
    label: 'VISIONEXPRESS',
    title: 'LENS',
    model: 'models/durst_enlarger_darkroom_asset.glb',
    images: [
      'images/product-visionexpress-frames-sunclip-flatlay-1.webp',
      'images/product-visionexpress-frames-lens-macro-detail-2.webp',
      'images/product-visionexpress-frames-front-face-studio-3.webp',
      'images/product-visionexpress-frames-temple-side-profile-4.webp',
      'images/product-visionexpress-frames-sunclip-3quarter-5.webp',
    ]
  },
  macclite: {
    label: 'MACCLITE',
    title: 'VESSEL',
    model: 'models/seeding_germination_watering_tray.glb',
    images: [
      'images/product-macclite-wok-overhead-blue-studio-1.webp',
      'images/product-macclite-wok-angled-dramatic-studio-2.webp',
      'images/product-macclite-crepe-pan-side-profile-studio-3.webp',
      'images/product-macclite-tawa-frontal-studio-4.webp',
      'images/product-macclite-pan-handle-macro-detail-5.webp',
      'images/product-macclite-pan-kitchen-counter-lifestyle-6.webp',
    ]
  },
  woven: {
    label: 'NATURAL FIBRE',
    title: 'WOVEN',
    model: 'models/free_conical_flask__laboratory__low_poly.glb',
    images: [
      'images/product-woven-basket-forest-editorial-bangalore-1.webp',
      'images/product-woven-basket-bougainvillea-lifestyle-bangalore-2.webp',
      'images/product-woven-tote-basket-dried-flowers-studio-3.webp',
      'images/product-woven-basket-overhead-citrus-4.webp',
      'images/product-woven-crossbody-bag-spotlight-studio-5.webp',
      'images/product-woven-open-basket-lifestyle-bangalore-6.webp',
    ]
  },
  lpsneakers: {
    label: 'LP SNEAKERS',
    title: 'SOLE',
    model: 'models/glass_bottle-freepoly.org.glb',
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

let productRenders = {};
let viewerZone = null;
let viewerIdx = 0;

function buildProductGallery() {
  const main = document.querySelector('main');
  const productTrigger = document.querySelector('[onclick="toggleProductGallery(true)"]');
  
  const gallery = document.createElement('div');
  gallery.id = 'product-gallery-sections';

  Object.entries(PRODUCTS).forEach(([key, product]) => {
    const section = document.createElement('section');
    section.className = 'product-section';
    section.dataset.product = key;

    const container = document.createElement('div');
    container.className = 'product-container';

    const text = document.createElement('div');
    text.className = 'product-text';
    text.innerHTML = `
      <p class="product-label">${product.label}</p>
      <h2 class="product-title">${product.title}</h2>
    `;

    const visual = document.createElement('div');
    visual.className = 'product-visual';

    const canvas = document.createElement('canvas');
    canvas.className = 'product-canvas';

    const photos = document.createElement('div');
    photos.className = 'product-photos';

    product.images.forEach((src, i) => {
      const thumb = document.createElement('div');
      thumb.className = 'product-photo-thumb' + (i === 0 ? ' active' : '');
      thumb.onclick = () => openViewer(key, i);

      const img = document.createElement('img');
      img.src = src;
      img.alt = `${product.label} ${i + 1}`;

      thumb.appendChild(img);
      photos.appendChild(thumb);
    });

    visual.appendChild(canvas);
    visual.appendChild(photos);

    container.appendChild(text);
    container.appendChild(visual);
    section.appendChild(container);
    gallery.appendChild(section);

    initProduct3D(key, canvas, product.model);
  });

  productTrigger.parentElement.insertBefore(gallery, productTrigger);
}

function initProduct3D(productKey, canvas, modelPath) {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, canvas.clientWidth / canvas.clientHeight, 0.1, 1000);
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  renderer.setSize(canvas.clientWidth, canvas.clientHeight);
  renderer.setClearColor(0x0a0402, 0.1);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;

  camera.position.set(0, 0, 3);
  camera.lookAt(0, 0, 0);

  // Lighting - same as David Langarica but with red neon
  const light1 = new THREE.PointLight(0xff4400, 2, 10);
  light1.position.set(5, 5, 5);
  scene.add(light1);

  const light2 = new THREE.PointLight(0xff2200, 1.5, 8);
  light2.position.set(-5, 3, 4);
  scene.add(light2);

  const ambient = new THREE.AmbientLight(0x1a0a06, 1.5);
  scene.add(ambient);

  const gltfLoader = new THREE.GLTFLoader();
  gltfLoader.load(modelPath, (gltf) => {
    const model = gltf.scene;
    
    // Hue shift to red neon
    model.traverse((node) => {
      if (node.isMesh && node.material) {
        const material = node.material;
        if (material.map) material.map.colorSpace = THREE.SRGBColorSpace;
        
        // Shift hue to red neon
        const origColor = material.color || new THREE.Color(0xffffff);
        material.color = new THREE.Color(0xff4400);
        material.emissive = new THREE.Color(0xff2200);
        material.emissiveIntensity = 0.3;
        material.metalness = 0.6;
        material.roughness = 0.4;
      }
    });

    // Scale and position
    const box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    const scale = 2.5 / maxDim;
    model.scale.multiplyScalar(scale);
    model.position.y = -size.y * scale / 2;

    scene.add(model);

    // Rotate animation
    function animate() {
      requestAnimationFrame(animate);
      model.rotation.y += 0.003;
      renderer.render(scene, camera);
    }
    animate();
  });

  // Handle resize
  window.addEventListener('resize', () => {
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
  });

  productRenders[productKey] = { scene, camera, renderer };
}

function openViewer(productKey, idx) {
  viewerZone = productKey;
  viewerIdx = idx;

  const product = PRODUCTS[productKey];
  const viewer = document.getElementById('darkroom-viewer');
  const img = document.getElementById('darkroom-viewer-img');
  const meta = document.getElementById('darkroom-viewer-meta');

  img.src = product.images[idx];
  img.alt = `${product.label} ${idx + 1}`;
  meta.textContent = `${product.label.toUpperCase()} // ${idx + 1} / ${product.images.length}`;

  viewer.classList.add('active');
}

function closeViewer() {
  document.getElementById('darkroom-viewer').classList.remove('active');
}

document.getElementById('darkroom-viewer-prev').addEventListener('click', () => {
  if (!viewerZone) return;
  const n = PRODUCTS[viewerZone].images.length;
  openViewer(viewerZone, (viewerIdx - 1 + n) % n);
});

document.getElementById('darkroom-viewer-next').addEventListener('click', () => {
  if (!viewerZone) return;
  const n = PRODUCTS[viewerZone].images.length;
  openViewer(viewerZone, (viewerIdx + 1) % n);
});

document.getElementById('darkroom-viewer-close').addEventListener('click', closeViewer);

// Initialize on page load
document.addEventListener('DOMContentLoaded', buildProductGallery);
