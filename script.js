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
    new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-1,6,1.0), new THREE.Vector3(-1,5.88,1.0)]),
    new THREE.LineBasicMaterial({color:0x222222})
  );
  drScene.add(cord);

  // FILL SAFELIGHT right side — dimmer, cooler red for contrast
  const safe2 = new THREE.PointLight(0xff1500, 8.0, 18, 2);
  safe2.position.set(4.5, 5.0, 0); drScene.add(safe2);
  const sh2 = new THREE.Mesh(shGeo.clone(), shMat.clone());
  sh2.position.set(4.5, 5.2, 0); drScene.add(sh2);
  const bulb2 = new THREE.Mesh(new THREE.SphereGeometry(0.04,10,8),
    new THREE.MeshBasicMaterial({color:0xff3300}));
  bulb2.position.set(4.5, 5.05, 0); drScene.add(bulb2);

  // BACK WALL WASH — soft amber uplight for depth
  const backWash = new THREE.PointLight(0xff6010, 4.5, 14, 2);
  backWash.position.set(0, 3.5, -6.5); drScene.add(backWash);

  // ENLARGER BEAM — warm white tight cone
  const enlargerBeam = new THREE.SpotLight(0xfff0d0, 40, 6, Math.PI/8, 0.25, 1.8);
  enlargerBeam.position.set(2.8, 2.5, -1.5);
  enlargerBeam.target.position.set(2.8, -2.5, -1.5);
  enlargerBeam.castShadow=true;
  enlargerBeam.shadow.mapSize.width = enlargerBeam.shadow.mapSize.height = 512;
  drScene.add(enlargerBeam); drScene.add(enlargerBeam.target);

  // Chemical tray warm orange bounce from below
  const trayGlow = new THREE.PointLight(0xff4400, 3.5, 6, 2);
  trayGlow.position.set(-2.2, -1.8, -0.5); drScene.add(trayGlow);

  // Rim light from behind left — separates objects from bg
  const rimLeft = new THREE.PointLight(0xff2200, 2.5, 12, 2);
  rimLeft.position.set(-8, 2, -2); drScene.add(rimLeft);

  /* ── Drying wire ── */
  const wireMat = new THREE.MeshStandardMaterial({ color:0x2a2a2a, roughness:0.5, metalness:0.6 });
  [-0.3, 0.4].forEach(z => {
    const wGeo = new THREE.CylinderGeometry(0.008, 0.008, 16, 8);
    wGeo.rotateZ(Math.PI/2);
    const w = new THREE.Mesh(wGeo, wireMat);
    w.position.set(0, 2.5, z); drScene.add(w);
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
    () => new Promise(res => {
      drTextureLoader.load(
        'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/textures/waternormals.jpg',
        tex => { tex.wrapS=tex.wrapT=THREE.RepeatWrapping; drTextureCache['waternormal']=tex; res(); },
        undefined, res
      );
    }),
    ...Object.entries(MODEL_PATHS).map(([key, path]) => () => new Promise(res => {
      drGLTFLoader.load(path, gltf => {
        gltf.scene.traverse(n => {
          if (n.isMesh) { n.castShadow=true; n.receiveShadow=true; }
        });
        drModelCache[key] = gltf.scene;
        res();
      }, undefined, res);
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

  placeSceneObjects();

  if (loading) {
    loading.style.opacity = '0';
    setTimeout(() => { loading.classList.add('hidden'); }, 800);
  }

  // Show scroll hint briefly
  const hint = document.getElementById('darkroom-hint');
  if (hint) { hint.classList.add('visible'); setTimeout(() => hint.classList.remove('visible'), 4000); }
}

/* ── Clone + auto-scale ── */
function cloneModel(key, targetHeight, pos, rot) {
  if (!drModelCache[key]) return null;
  const m = drModelCache[key].clone(true);
  const box = new THREE.Box3().setFromObject(m);
  const size = new THREE.Vector3();
  box.getSize(size);
  const maxDim = Math.max(size.x, size.y, size.z);
  if (maxDim > 0) m.scale.setScalar(targetHeight / maxDim);
  if (pos) m.position.set(...pos);
  if (rot) m.rotation.set(...rot);
  m.traverse(n => { if (n.isMesh) { n.castShadow=true; n.receiveShadow=true; } });
  drScene.add(m);
  return m;
}

/* Helper — table top Y given table base position and target height */
const TABLE_HEIGHT = 1.2;
const FLOOR_Y = -3.5;
const TABLE_TOP_Y = FLOOR_Y + TABLE_HEIGHT; // ≈ -2.3

function placeSceneObjects() {
  /* ── LEFT TABLE — developing trays (woven zone) ── */
  cloneModel('table', TABLE_HEIGHT, [-2.2, FLOOR_Y, -1.5], [0,0,0]);

  // 3 developing trays ON the table surface (y = TABLE_TOP_Y)
  [[-2.7, TABLE_TOP_Y, -0.9], [-2.2, TABLE_TOP_Y, -0.9], [-1.7, TABLE_TOP_Y, -0.9]].forEach(pos => {
    cloneModel('tray', 0.35, pos, [0,0,0]);
  });

  // Thermometer: standing in tray with slight lean — NOT floating
  // Tray top is TABLE_TOP_Y, tray is 35cm tall, tray interior ≈ TABLE_TOP_Y+0.1
  cloneModel('thermometer', 0.22, [-2.7, TABLE_TOP_Y + 0.11, -0.87], [0, 0, Math.PI/8]);

  // Tongs resting across tray edge
  buildTongs(-1.95, TABLE_TOP_Y + 0.04, -0.75, 0.3);
  buildTongs(-2.45, TABLE_TOP_Y + 0.04, -0.65, -0.2);
  buildSqueegee(-1.5, TABLE_TOP_Y + 0.1, -1.1);

  // Funnel and flask on table surface back corner
  cloneModel('funnel', 0.15, [-3.05, TABLE_TOP_Y, -1.75], [0,0,0]);
  cloneModel('flask',  0.22, [-3.25, TABLE_TOP_Y, -1.45], [0,0,0]);

  /* ── CONTACT SHEET ON WALL ── */
  buildContactSheetWall();

  /* ── DRYING LINE ── */
  buildDryingLine();

  /* ── RIGHT TABLE — enlarger + eyewear ── */
  cloneModel('table', TABLE_HEIGHT, [2.8, FLOOR_Y, -1.5], [0,0,0]);
  cloneModel('enlarger', 0.60, [2.8, TABLE_TOP_Y, -1.8], [0, Math.PI, 0]);
  // Stopwatch flat on table
  cloneModel('stopwatch', 0.08, [1.85, TABLE_TOP_Y + 0.01, -0.85], [Math.PI/2, 0, 0]);
  // Glassware set on table
  cloneModel('glassware', 0.25, [3.75, TABLE_TOP_Y, -1.95], [0,0,0]);

  buildEnlargerBaseboard();

  /* ── SIDE WALL — cookware prints ── */
  buildSideWallPrints();

  /* ── CABINET + SHELVES ── */
  cloneModel('cabinet', 1.8, [-6.5, FLOOR_Y + 0.9, -4.5], [0, Math.PI/2, 0]);
  [[-6.0, 1.2, -4.2], [-6.5, 1.2, -4.2], [-7.0, 1.15, -4.2]].forEach(pos => {
    cloneModel('bottle', 0.30, pos, [0, Math.random()*0.3, 0]);
  });
  cloneModel('flask',   0.22, [-6.8, 0.78, -4.2], [0, 0.4, 0]);
  cloneModel('funnel',  0.15, [-6.2, 0.78, -4.0], [0,0,0]);
  cloneModel('polaroid',0.10, [-6.5, 1.78, -4.0], [0, Math.PI/2+0.2, 0]);

  buildPinboard();
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

    const clip = drModelCache['clip'] ? drModelCache['clip'].clone(true) : null;
    if (clip) {
      clip.scale.setScalar(0.015);
      clip.position.set(sX+i*spacing, 2.26, -0.3);
      clip.rotation.z = rots[i%rots.length];
      drScene.add(clip);
    }

    drScene.add(new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(sX+i*spacing, 2.5, -0.3),
        new THREE.Vector3(sX+i*spacing, 2.28, -0.3)
      ]),
      new THREE.LineBasicMaterial({color:0x333333})
    ));
  });
}

function buildEnlargerBaseboard() {
  const imgs = PRODUCT_ZONES.enlarger.images;
  const positions = [[0,-0.22],[-.25,0.2],[.25,0.2],[-0.1,-0.05],[0.2,-0.1]];
  const rots = [0, 0.12, -0.08, 0.06, -0.10];
  imgs.forEach((img, i) => {
    if (i >= positions.length) return;
    const mesh = buildPhotoPlane(img.src, 0.65, 0.5);
    mesh.rotation.x = -Math.PI/2;
    mesh.rotation.z = rots[i];
    // Lay flat on enlarger baseboard (table surface level)
    mesh.position.set(2.8+positions[i][0], TABLE_TOP_Y + 0.02, -1.5+positions[i][1]);
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
  const board = new THREE.Mesh(
    new THREE.BoxGeometry(5.5, 1.8, 0.06),
    new THREE.MeshStandardMaterial({ color:0x3a2010, roughness:0.95, metalness:0.0 })
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
  const piv = new THREE.Mesh(new THREE.CylinderGeometry(0.012,0.012,0.025,8), mat);
  piv.rotation.z = Math.PI/2; piv.position.set(x, y+0.1, z);
  drScene.add(piv);
}

function buildSqueegee(x, y, z) {
  const mat = new THREE.MeshStandardMaterial({ color:0x0d0d0d, roughness:0.8, metalness:0.1 });
  const h = new THREE.Mesh(new THREE.CylinderGeometry(0.018,0.018,0.45,10), mat);
  h.position.set(x, y+0.1, z); h.rotation.z=0.3; h.castShadow=true; drScene.add(h);
  const blade = new THREE.Mesh(new THREE.BoxGeometry(0.28,0.028,0.012),
    new THREE.MeshStandardMaterial({color:0x050505, roughness:0.95}));
  blade.position.set(x-0.12, y-0.06, z); drScene.add(blade);
}

/* ── Generic photo plane ── */
function buildPhotoPlane(src, w, h) {
  const mat = new THREE.MeshStandardMaterial({
    color: 0x1a0a08, roughness:0.85, metalness:0.0,
    transparent:true, opacity:0.9
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  mesh.castShadow = true;

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

/* ── SCROLL-DRIVEN CAMERA ── */
// While darkroom is open, page scroll is captured and drives drScrollT
let drScrollBound = null;
let drWheelBound  = null;
let drTouchBound  = { start: null, move: null };
let _drTouchStartY = 0;

function onDrPageScroll(e) {
  // Prevent page scroll, accumulate internal scroll
  e.preventDefault();
  const delta = e.deltaY || e.detail || 0;
  drScrollY = Math.max(0, Math.min(
    drScrollY + delta,
    DR_ZONE_SCROLL_PX * (ZONE_ORDER.length - 1)
  ));
  drScrollT = drScrollY / (DR_ZONE_SCROLL_PX * (ZONE_ORDER.length - 1));

  // Update zone index
  const newIdx = Math.round(drScrollT * (ZONE_ORDER.length - 1));
  if (newIdx !== currentZoneIdx) {
    currentZoneIdx = newIdx;
    updateZoneUI(currentZoneIdx);
    if (typeof triggerGLGlitch === 'function') triggerGLGlitch(80);
  }
}

function onDrTouchStartPage(e) {
  _drTouchStartY = e.touches[0].clientY;
  drTargetParaX = ((e.touches[0].clientX/window.innerWidth)*2-1)*0.6;
}
function onDrTouchMovePage(e) {
  e.preventDefault();
  const dy = _drTouchStartY - e.touches[0].clientY;
  drScrollY = Math.max(0, Math.min(
    drScrollY + dy * 1.4,
    DR_ZONE_SCROLL_PX * (ZONE_ORDER.length - 1)
  ));
  _drTouchStartY = e.touches[0].clientY;
  drScrollT = drScrollY / (DR_ZONE_SCROLL_PX * (ZONE_ORDER.length - 1));

  const newIdx = Math.round(drScrollT * (ZONE_ORDER.length - 1));
  if (newIdx !== currentZoneIdx) {
    currentZoneIdx = newIdx;
    updateZoneUI(currentZoneIdx);
  }
  drTargetParaX = ((e.touches[0].clientX/window.innerWidth)*2-1)*0.5;
  drTargetParaY = -((e.touches[0].clientY/window.innerHeight)*2-1)*0.3;
}

function attachScrollHijack() {
  drScrollBound = onDrPageScroll.bind(null);
  drTouchBound.start = onDrTouchStartPage.bind(null);
  drTouchBound.move  = onDrTouchMovePage.bind(null);

  // Hijack wheel on the product-page overlay, not window
  const productPage = document.getElementById('product-page');
  productPage.addEventListener('wheel', drScrollBound, { passive: false });
  productPage.addEventListener('touchstart', drTouchBound.start, { passive: true });
  productPage.addEventListener('touchmove',  drTouchBound.move,  { passive: false });
}

function detachScrollHijack() {
  const productPage = document.getElementById('product-page');
  if (drScrollBound) productPage.removeEventListener('wheel', drScrollBound);
  if (drTouchBound.start) productPage.removeEventListener('touchstart', drTouchBound.start);
  if (drTouchBound.move)  productPage.removeEventListener('touchmove',  drTouchBound.move);
  drScrollBound = null; drTouchBound.start = null; drTouchBound.move = null;
}

function updateZoneUI(idx) {
  document.querySelectorAll('.dr-zone-dot').forEach((d,i) => d.classList.toggle('active', i===idx));
  const label = document.getElementById('darkroom-label');
  if (label) {
    label.textContent = PRODUCT_ZONES[ZONE_ORDER[idx]].label;
    label.style.opacity = '1';
    setTimeout(() => { label.style.opacity = '0'; }, 2500);
  }
}

/* ── Mouse hover ── */
function onDrMouseMove(e) {
  if (!isDarkroomOpen) return;
  drTargetParaX = ((e.clientX/window.innerWidth)*2-1)*0.8;
  drTargetParaY = -((e.clientY/window.innerHeight)*2-1)*0.4;
  drMouse.set((e.clientX/window.innerWidth)*2-1, -((e.clientY/window.innerHeight)*2-1));
}

function onDrClick(e) {
  if (!isDarkroomOpen || !drHovered) return;
  const {zone, imgIndex} = drHovered.userData;
  if (zone != null && imgIndex != null) openDarkroomViewer(zone, imgIndex);
}

/* ── Render loop ── */
let drTime = 0;
function darkroomRenderLoop() {
  if (!isDarkroomOpen) return;
  drAnimFrame = requestAnimationFrame(darkroomRenderLoop);
  drTime += 0.016;

  // Update liquid shaders
  drLiquidMeshes.forEach(m => { if (m.material.uniforms) m.material.uniforms.uTime.value = drTime; });

  // Smooth parallax
  drParallaxX += (drTargetParaX - drParallaxX) * 0.04;
  drParallaxY += (drTargetParaY - drParallaxY) * 0.04;

  // Smooth scrollT
  drRenderT += (drScrollT - drRenderT) * 0.055;

  if (drSpline) {
    const splineT = scrollTtoSplineT(drRenderT);
    const pos = drSpline.getPointAt(Math.max(0, Math.min(1, splineT)));
    drCamera.position.copy(pos);
    drCamera.position.x += drParallaxX * 0.3;
    drCamera.position.y += drParallaxY * 0.2;

    // Interpolate lookAt between adjacent zones
    const zoneF    = drRenderT * (ZONE_ORDER.length - 1);
    const lowerIdx = Math.max(0, Math.min(ZONE_ORDER.length - 2, Math.floor(zoneF)));
    const frac     = zoneF - lowerIdx;
    const la0 = PRODUCT_ZONES[ZONE_ORDER[lowerIdx]].cameraLookAt;
    const la1 = PRODUCT_ZONES[ZONE_ORDER[Math.min(ZONE_ORDER.length-1, lowerIdx+1)]].cameraLookAt;
    const lookAt = new THREE.Vector3().lerpVectors(la0, la1, frac);
    lookAt.x += drParallaxX * 0.1;
    lookAt.y += drParallaxY * 0.1;
    drCamera.lookAt(lookAt);
  }

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

/* ── Resize ── */
function onDrResize() {
  if (!drRenderer) return;
  drCamera.aspect = window.innerWidth/window.innerHeight;
  drCamera.updateProjectionMatrix();
  drRenderer.setSize(window.innerWidth, window.innerHeight);
  drComposer.setSize(window.innerWidth, window.innerHeight);
}

/* ── MOBILE — 3D scene, not a list ── */
// On mobile we still run the 3D scene (lower pixel ratio for perf)
// but the scroll inside the overlay drives the camera
function initMobileDarkroom() {
  if (!drInited) {
    initDarkroom();
    // Lower res for mobile
    drRenderer.setPixelRatio(1);
  }
}

/* ── Viewer ── */
function openDarkroomViewer(zone, idx) {
  drViewerZone = zone; drViewerIdx = idx;
  const imgs = PRODUCT_ZONES[zone].images;
  const viewer = document.getElementById('darkroom-viewer');
  const img    = document.getElementById('darkroom-viewer-img');
  const meta   = document.getElementById('darkroom-viewer-meta');
  img.src = imgs[idx].src; img.alt = imgs[idx].alt;
  img.style.animation = 'none'; img.offsetHeight;
  img.style.animation = 'dr-develop 1.2s ease forwards';
  meta.textContent = `${PRODUCT_ZONES[zone].label} // ${idx+1} / ${imgs.length}`;
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

/* ── Main toggle ── */
async function toggleProductGallery(open) {
  isDarkroomOpen = open;
  const page = document.getElementById('product-page');
  page.classList.toggle('active', open);
  document.body.style.overflow = open ? 'hidden' : 'auto';

  if (open) {
    const isMobile = window.innerWidth <= 900;

    // Always use 3D scene — mobile gets lower res
    initDarkroom();
    if (isMobile) {
      drRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 1));
      drComposer && drComposer.setPixelRatio && drComposer.setPixelRatio(1);
    }

    // Hide old mobile list fallback
    const mobileEl = document.getElementById('darkroom-mobile');
    if (mobileEl) mobileEl.style.display = 'none';

    // Show canvas on mobile too
    const canvas = document.getElementById('darkroom-canvas');
    if (canvas) canvas.style.display = 'block';

    // Reset scroll
    drScrollY = 0; drScrollT = 0; drRenderT = 0;
    currentZoneIdx = 0; drParallaxX = 0; drParallaxY = 0;
    drTargetParaX = 0; drTargetParaY = 0;

    canvas.addEventListener('mousemove', onDrMouseMove);
    canvas.addEventListener('click', onDrClick);

    attachScrollHijack();
    updateZoneUI(0);

    // Intro: auto-zoom from wide to zone 0
    // Start camera far back, then tween to zone 0 position
    const zone0 = PRODUCT_ZONES.tray;
    drCamera.position.set(zone0.cameraPos.x, zone0.cameraPos.y + 1.5, zone0.cameraPos.z + 4);
    drCamera.lookAt(zone0.cameraLookAt);

    if (!drAssetsLoaded) {
      darkroomRenderLoop();
      await buildDarkroomScene();
    }
    darkroomRenderLoop();

    // Auto intro zoom: 0.8s wide then settle
    let introT = 0;
    const introStart = Date.now();
    function introZoom() {
      const elapsed = (Date.now() - introStart) / 800;
      if (elapsed >= 1 || drScrollT > 0.02) return; // user started scrolling
      // blend from far to close position
      const ease = elapsed < 1 ? elapsed * elapsed * (3 - 2 * elapsed) : 1;
      drCamera.position.lerpVectors(
        new THREE.Vector3(zone0.cameraPos.x, zone0.cameraPos.y + 1.5, zone0.cameraPos.z + 4),
        zone0.cameraPos,
        ease
      );
      drCamera.lookAt(zone0.cameraLookAt);
      if (elapsed < 1) requestAnimationFrame(introZoom);
    }
    requestAnimationFrame(introZoom);

  } else {
    if (drAnimFrame) { cancelAnimationFrame(drAnimFrame); drAnimFrame = null; }
    const canvas = document.getElementById('darkroom-canvas');
    canvas.removeEventListener('mousemove', onDrMouseMove);
    canvas.removeEventListener('click', onDrClick);
    detachScrollHijack();
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
