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
   DARKROOM — PRODUCT GALLERY v4
   Clean rebuild. 3 zones. David Langarica scroll style.
   Zone 1: Enlarger table — photos on baseboard
   Zone 2: Developing tray — photos emerging from liquid
   Zone 3: Back wall — photos pinned, pull-back reveal
════════════════════════════════════════════════════════ */

/* ── Zone definitions ── */
const PRODUCT_ZONES = {
  enlarger: {
    label: 'ENLARGER // PRINT',
    cameraPos:    new THREE.Vector3(0, 0.8, 4.5),
    cameraLookAt: new THREE.Vector3(0, -0.2, 0),
    images: [
      { src: 'images/product-visionexpress-frames-sunclip-flatlay-1.webp',     alt: 'VisionExpress flatlay' },
      { src: 'images/product-visionexpress-frames-lens-macro-detail-2.webp',   alt: 'VisionExpress macro' },
      { src: 'images/product-visionexpress-frames-front-face-studio-3.webp',   alt: 'VisionExpress front' },
      { src: 'images/product-visionexpress-frames-temple-side-profile-4.webp', alt: 'VisionExpress temple' },
      { src: 'images/product-visionexpress-frames-sunclip-3quarter-5.webp',    alt: 'VisionExpress 3/4' },
    ]
  },
  tray: {
    label: 'DEVELOP // CHEMICAL',
    cameraPos:    new THREE.Vector3(-1.5, 2.2, 3.0),
    cameraLookAt: new THREE.Vector3(-1.5, -1.2, -0.5),
    images: [
      { src: 'images/product-woven-basket-forest-editorial-bangalore-1.webp',        alt: 'Woven basket forest' },
      { src: 'images/product-woven-basket-bougainvillea-lifestyle-bangalore-2.webp', alt: 'Woven bougainvillea' },
      { src: 'images/product-woven-tote-basket-dried-flowers-studio-3.webp',         alt: 'Woven tote dried' },
      { src: 'images/product-woven-basket-overhead-citrus-4.webp',                   alt: 'Woven citrus' },
      { src: 'images/product-woven-crossbody-bag-spotlight-studio-5.webp',           alt: 'Woven crossbody' },
      { src: 'images/product-woven-open-basket-lifestyle-bangalore-6.webp',          alt: 'Open weave basket' },
      { src: 'images/product-natural-fibre-mat-table-setting-brass-7.webp',          alt: 'Natural fibre mat' },
    ]
  },
  wall: {
    label: 'ARCHIVE // WALL',
    cameraPos:    new THREE.Vector3(0, 0.5, 5.5),
    cameraLookAt: new THREE.Vector3(0, 0.2, -6.0),
    images: [
      { src: 'images/product-macclite-wok-overhead-blue-studio-1.webp',       alt: 'MACclite wok blue' },
      { src: 'images/product-macclite-wok-angled-dramatic-studio-2.webp',     alt: 'MACclite wok angled' },
      { src: 'images/product-macclite-crepe-pan-side-profile-studio-3.webp',  alt: 'MACclite crepe pan' },
      { src: 'images/product-macclite-tawa-frontal-studio-4.webp',            alt: 'MACclite tawa' },
      { src: 'images/product-macclite-pan-handle-macro-detail-5.webp',        alt: 'MACclite handle' },
      { src: 'images/product-macclite-pan-kitchen-counter-lifestyle-6.webp',  alt: 'MACclite kitchen' },
      { src: 'images/product-louis-philippe-sneaker-side-profile-studio-1.webp', alt: 'LP sneaker side' },
      { src: 'images/product-louis-philippe-sneaker-pair-front-angle-6.webp', alt: 'LP sneaker front' },
      { src: 'images/product-louis-philippe-tie-box-flatlay-studio-1.webp',   alt: 'LP tie box' },
    ]
  }
};

const ZONE_ORDER = ['enlarger', 'tray', 'wall'];

/* ── Model paths — only what we actually use ── */
const MODEL_PATHS = {
  enlarger:    'models/durst_enlarger_darkroom_asset.glb',
  table:       'models/wood_table_pbr_low-poly.glb',
  tray:        'models/seeding_germination_watering_tray.glb',
  thermometer: 'models/thermometer.glb',
  stopwatch:   'models/stopwatch-284.glb',
  pin:         'models/cc0_-_pin_2.glb',
  polaroid:    'models/polaroid_photo_sample.glb',
};

/* ── Vignette + warm grade + heavy haze post shader ── */
const VignetteShader = {
  uniforms: {
    tDiffuse:    { value: null },
    darkness:    { value: 1.9 },
    warmTint:    { value: 0.02 },
    hazeDensity: { value: 0.70 },
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
      float vig = pow(uv.x*uv.y*16.0, 0.9);
      c.rgb *= mix(1.0-darkness*0.45, 1.0, vig);
      c.r = min(1.0, c.r + warmTint * 0.8);
      c.g = min(1.0, c.g + warmTint * 0.2);
      c.b = max(0.0, c.b - warmTint * 0.6);
      float haze = hazeDensity * (1.0 - vig) * 0.5;
      vec3 hazeColor = vec3(0.03, 0.01, 0.00);
      c.rgb = mix(c.rgb, hazeColor, haze);
      gl_FragColor = c;
    }
  `
};

/* ── Liquid developing tray shader ── */
const LiquidShader = {
  uniforms: {
    tPhoto:   { value: null },
    tNormal:  { value: null },
    uTime:    { value: 0 },
    uDevelop: { value: 0 },
  },
  vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
  fragmentShader: `
    uniform sampler2D tPhoto;
    uniform sampler2D tNormal;
    uniform float uTime;
    uniform float uDevelop;
    varying vec2 vUv;
    void main(){
      vec2 n1 = texture2D(tNormal, vUv*1.5 + vec2(uTime*0.015, uTime*0.012)).rg * 2.0 - 1.0;
      vec2 n2 = texture2D(tNormal, vUv*2.2 - vec2(uTime*0.010, uTime*0.018)).rg * 2.0 - 1.0;
      vec2 distort = (n1+n2)*0.008;
      vec4 photo  = texture2D(tPhoto, vUv + distort * uDevelop);
      vec4 liquid = vec4(0.05, 0.02, 0.01, 0.92);
      float emerge = smoothstep(0.0, 1.0, uDevelop);
      vec2 cUv = vUv - 0.5;
      float highlight = pow(max(0.0, 1.0 - length(cUv)*2.5), 3.0) * 0.18;
      vec3 col = mix(liquid.rgb, photo.rgb, emerge * 0.9);
      col += highlight * vec3(0.9, 0.6, 0.3);
      float edge = smoothstep(0.0, 0.04, min(vUv.x, min(1.0-vUv.x, min(vUv.y, 1.0-vUv.y))));
      col *= edge;
      gl_FragColor = vec4(col, mix(0.88, 0.96, emerge));
    }
  `
};

/* ── State ── */
let drRenderer, drScene, drCamera, drComposer;
let drAnimFrame  = null;
let isDarkroomOpen = false;
let drInited     = false;
let drAssetsLoaded = false;
let drTextureLoader, drGLTFLoader;
let drTextureCache = {};
let drModelCache   = {};
let drLiquidMeshes = [];
let drPhotoMeshes  = [];
let drHovered      = null;
let drRaycaster, drMouse;
let drViewerZone = null, drViewerIdx = 0;

/* ── Scroll state ── */
let currentZoneIdx = 0;
let drScrollT      = 0;
let drRenderT      = 0;
let drScrollY      = 0;
let drParallaxX    = 0, drParallaxY = 0;
let drTargetParaX  = 0, drTargetParaY = 0;
const DR_ZONE_SCROLL_PX = typeof window !== 'undefined' ? (window.innerHeight || 700) : 700;

/* ── Camera spline ── */
let drSpline;
function buildCameraSpline() {
  const pts = ZONE_ORDER.map(k => PRODUCT_ZONES[k].cameraPos.clone());
  pts.unshift(pts[0].clone().add(new THREE.Vector3(0, 1.5, 3)));
  pts.push(pts[pts.length-1].clone());
  drSpline = new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.5);
}
function zoneT(idx) { return (idx+1) / (ZONE_ORDER.length+1); }
function scrollTtoSplineT(st) {
  const zoneF = st * (ZONE_ORDER.length-1);
  const lo = Math.max(0, Math.min(ZONE_ORDER.length-2, Math.floor(zoneF)));
  const frac = zoneF - lo;
  return zoneT(lo) + (zoneT(lo+1) - zoneT(lo)) * frac;
}

/* ── Scene constants ── */
const FLOOR_Y     = -3.2;
const TABLE_H     = 1.1;
const TABLE_TOP_Y = FLOOR_Y + TABLE_H; // -2.1

/* ── Init ── */
function initDarkroom() {
  if (!window.THREE || drInited) return;
  drInited = true;

  const canvas = document.getElementById('darkroom-canvas');
  drRenderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  drRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  drRenderer.setSize(window.innerWidth, window.innerHeight);
  drRenderer.setClearColor(0x010000, 1);
  drRenderer.toneMapping = THREE.ACESFilmicToneMapping;
  drRenderer.toneMappingExposure = 1.05;
  drRenderer.shadowMap.enabled = true;
  drRenderer.shadowMap.type = THREE.PCFSoftShadowMap;
  drRenderer.physicallyCorrectLights = true;

  drScene = new THREE.Scene();
  /* Dense black-brown fog — swallows anything more than 8 units away */
  drScene.fog = new THREE.FogExp2(0x080200, 0.10);

  drCamera = new THREE.PerspectiveCamera(50, window.innerWidth/window.innerHeight, 0.05, 60);
  drCamera.position.copy(PRODUCT_ZONES.enlarger.cameraPos);
  drCamera.lookAt(PRODUCT_ZONES.enlarger.cameraLookAt);

  drRaycaster = new THREE.Raycaster();
  drMouse     = new THREE.Vector2(-9, -9);

  drTextureLoader = new THREE.TextureLoader();
  drGLTFLoader    = new THREE.GLTFLoader();

  buildCameraSpline();

  /* Post-processing */
  drComposer = new THREE.EffectComposer(drRenderer);
  drComposer.addPass(new THREE.RenderPass(drScene, drCamera));

  /* Bloom — warm safelight halos */
  drComposer.addPass(new THREE.UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    1.1, 0.55, 0.68
  ));

  /* Film grain */
  drComposer.addPass(new THREE.FilmPass(0.25, 0.03, 512, false));

  /* Vignette + haze */
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

/* ── Room shell + lighting ── */
function buildRoom() {
  /* Near-black walls and floor with warm undertone */
  const wallMat  = new THREE.MeshStandardMaterial({ color: 0x040100, roughness: 0.98, metalness: 0.0 });
  const floorMat = new THREE.MeshStandardMaterial({ color: 0x020000, roughness: 0.99, metalness: 0.0 });

  /* Walls */
  [
    [0, 0, -9,    0,           0          ],
    [-8, 0, 0,    0,           Math.PI/2  ],
    [8,  0, 0,    0,          -Math.PI/2  ],
    [0,  5, 0,    Math.PI/2,   0          ],
  ].forEach(([x,y,z,rx,ry]) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(28, 12), wallMat);
    m.position.set(x,y,z); m.rotation.x=rx; m.rotation.y=ry||0;
    m.receiveShadow = true; drScene.add(m);
  });

  /* Floor */
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(28, 28), floorMat);
  floor.rotation.x = -Math.PI/2; floor.position.y = FLOOR_Y;
  floor.receiveShadow = true; drScene.add(floor);

  /* ── LIGHTING — David Langarica style: one key, everything else near zero ── */

  /* Minimal ambient — just enough to see silhouettes */
  drScene.add(new THREE.AmbientLight(0x100400, 0.8));

  /* PRIMARY KEY — enlarger beam, tight spot straight down onto baseboard */
  const enlargerSpot = new THREE.SpotLight(0xfff5d0, 60, 5.5, Math.PI/10, 0.18, 1.6);
  enlargerSpot.position.set(0, 2.2, -0.5);
  enlargerSpot.target.position.set(0, TABLE_TOP_Y, -0.5);
  enlargerSpot.castShadow = true;
  enlargerSpot.shadow.mapSize.width = enlargerSpot.shadow.mapSize.height = 1024;
  drScene.add(enlargerSpot); drScene.add(enlargerSpot.target);

  /* SAFELIGHT — single warm red-orange from ceiling left, everything else in shadow */
  const safe = new THREE.PointLight(0xff3200, 22, 16, 2.0);
  safe.position.set(-2, 4.8, 1.5);
  safe.castShadow = true;
  safe.shadow.mapSize.width = safe.shadow.mapSize.height = 512;
  drScene.add(safe);

  /* Safelight housing geometry */
  const shGeo = new THREE.CylinderGeometry(0.05, 0.20, 0.24, 12);
  const shMat = new THREE.MeshStandardMaterial({ color: 0x0e0804, roughness: 0.7, metalness: 0.3 });
  const sh = new THREE.Mesh(shGeo, shMat);
  sh.position.set(-2, 5.0, 1.5); drScene.add(sh);
  const bulb = new THREE.Mesh(
    new THREE.SphereGeometry(0.04, 10, 8),
    new THREE.MeshBasicMaterial({ color: 0xff4400 })
  );
  bulb.position.set(-2, 4.88, 1.5); drScene.add(bulb);
  const cord = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-2, 5.2, 1.5),
      new THREE.Vector3(-2, 5.08, 1.5)
    ]),
    new THREE.LineBasicMaterial({ color: 0x1a1a1a })
  );
  drScene.add(cord);

  /* TRAY GLOW — warm orange from below the developing tray zone */
  const trayGlow = new THREE.PointLight(0xff4500, 6.0, 5, 2);
  trayGlow.position.set(-1.5, TABLE_TOP_Y - 0.5, -0.3);
  drScene.add(trayGlow);

  /* BACK WALL RIM — very dim, just enough to separate photos from wall */
  const wallRim = new THREE.PointLight(0xff2000, 1.5, 10, 2.5);
  wallRim.position.set(0, 2.5, -7.0);
  drScene.add(wallRim);

  /* Enlarger beam volumetric cone — procedural cylinder for visual */
  const coneGeo = new THREE.CylinderGeometry(0.08, 0.55, 2.8, 16, 1, true);
  const coneMat = new THREE.MeshBasicMaterial({
    color: 0xfff0b0, transparent: true, opacity: 0.04,
    side: THREE.BackSide, depthWrite: false
  });
  const cone = new THREE.Mesh(coneGeo, coneMat);
  cone.position.set(0, TABLE_TOP_Y + 1.4, -0.5);
  drScene.add(cone);
}

/* ── Clone model — bottom sits at pos[1] ── */
function cloneModel(key, targetH, pos, rot) {
  if (!drModelCache[key]) return null;
  const m = drModelCache[key].clone(true);

  /* Scale by max dimension */
  const b0 = new THREE.Box3().setFromObject(m);
  const s0 = new THREE.Vector3(); b0.getSize(s0);
  const maxD = Math.max(s0.x, s0.y, s0.z);
  if (maxD > 0) m.scale.setScalar(targetH / maxD);

  /* Apply rotation first so bounding box is correct */
  if (rot) m.rotation.set(...rot);

  /* Recompute box after scale+rotation, lift so bottom = pos[1] */
  const b1 = new THREE.Box3().setFromObject(m);
  const bottomOffset = b1.min.y;
  m.position.set(pos[0], pos[1] - bottomOffset, pos[2]);

  m.traverse(n => { if (n.isMesh) { n.castShadow = true; n.receiveShadow = true; } });
  drScene.add(m);
  return m;
}

/* ── Generic photo plane — fades in as texture loads ── */
function buildPhotoPlane(src, w, h) {
  const mat = new THREE.MeshStandardMaterial({
    color: 0x0a0402, roughness: 0.88, metalness: 0.0,
    transparent: true, opacity: 0.9
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  mesh.castShadow = true;
  drTextureLoader.load(src, tex => {
    tex.minFilter = THREE.LinearFilter; tex.generateMipmaps = false;
    mesh.material = new THREE.MeshStandardMaterial({
      map: tex, color: 0xfff2ee, roughness: 0.80, metalness: 0.0,
      transparent: true, opacity: 0.0
    });
    const start = Date.now();
    (function fade() {
      const t = (Date.now() - start) / 2000;
      mesh.material.opacity = Math.min(t, 0.95);
      if (t < 1) requestAnimationFrame(fade);
    })();
  }, undefined, () => {});
  return mesh;
}

/* ── Load assets ── */
async function loadAllAssets() {
  const loading = document.getElementById('dr-loading');
  const fill    = document.getElementById('dr-loading-fill');
  const sub     = document.getElementById('dr-loading-sub');

  const tasks = [
    /* Water normal for liquid shader */
    () => new Promise(res => {
      drTextureLoader.load(
        'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/textures/waternormals.jpg',
        tex => { tex.wrapS = tex.wrapT = THREE.RepeatWrapping; drTextureCache['waternormal'] = tex; res(); },
        undefined, res
      );
    }),
    /* GLB models */
    ...Object.entries(MODEL_PATHS).map(([key, path]) => () => new Promise(res => {
      drGLTFLoader.load(path, gltf => {
        gltf.scene.traverse(n => { if (n.isMesh) { n.castShadow = true; n.receiveShadow = true; } });
        drModelCache[key] = gltf.scene;
        res();
      }, undefined, res);
    })),
  ];

  let done = 0;
  for (const task of tasks) {
    await task();
    done++;
    const pct = Math.round((done / tasks.length) * 100);
    if (fill) fill.style.width = pct + '%';
    if (sub)  sub.textContent  = 'LOADING_ASSETS // ' + pct + '%';
  }

  placeSceneObjects();

  if (loading) {
    loading.style.opacity = '0';
    setTimeout(() => loading.classList.add('hidden'), 800);
  }

  const hint = document.getElementById('darkroom-hint');
  if (hint) { hint.classList.add('visible'); setTimeout(() => hint.classList.remove('visible'), 4000); }
}

/* ══════════════════════════════════════════════════════
   SCENE OBJECTS — 3 zones, curated props only
══════════════════════════════════════════════════════ */
function placeSceneObjects() {
  buildZoneEnlarger();
  buildZoneTray();
  buildZoneWall();
}

/* ── ZONE 1: ENLARGER TABLE ── */
function buildZoneEnlarger() {
  /* Table */
  cloneModel('table', TABLE_H, [0, FLOOR_Y, -0.8], [0, 0, 0]);

  /* Enlarger on table — tall, centred */
  cloneModel('enlarger', 1.6, [0, TABLE_TOP_Y, -1.2], [0, Math.PI, 0]);

  /* Stopwatch flat on table beside enlarger */
  cloneModel('stopwatch', 0.07, [0.7, TABLE_TOP_Y, -0.4], [Math.PI/2, 0, 0.3]);

  /* Polaroid print lying flat on baseboard under enlarger beam */
  cloneModel('polaroid', 0.22, [0, TABLE_TOP_Y, -0.3], [-Math.PI/2, 0, 0.15]);

  /* Photos laid flat on baseboard — enlarger is printing them */
  const enlargerImgs = PRODUCT_ZONES.enlarger.images;
  const printRots  = [0, 0.08, -0.06, 0.12, -0.10];
  const printPos   = [
    [ 0.0,  0.0], [-0.22, 0.18], [0.20, 0.15],
    [-0.15,-0.18], [ 0.18,-0.20]
  ];
  enlargerImgs.forEach((img, i) => {
    if (i >= printPos.length) return;
    const mesh = buildPhotoPlane(img.src, 0.55, 0.42);
    mesh.rotation.x = -Math.PI / 2;
    mesh.rotation.z = printRots[i];
    mesh.position.set(
      printPos[i][0],
      TABLE_TOP_Y + 0.015,
      -0.45 + printPos[i][1]
    );
    mesh.userData = { zone: 'enlarger', imgIndex: i, label: PRODUCT_ZONES.enlarger.label };
    drPhotoMeshes.push(mesh);
    drScene.add(mesh);
  });
}

/* ── ZONE 2: DEVELOPING TRAY ── */
function buildZoneTray() {
  /* Second table slightly left */
  cloneModel('table', TABLE_H, [-1.5, FLOOR_Y, -0.8], [0, 0, 0]);

  /* 3 developing trays in a row ON the table */
  const trayPositions = [[-2.1, -1.5, -0.85], [-1.5, -1.5, -0.85], [-0.9, -1.5, -0.85]];
  trayPositions.forEach(pos => {
    cloneModel('tray', 0.28, [pos[0], TABLE_TOP_Y, pos[2]], [0, 0, 0]);
  });

  /* Thermometer leaning in first tray */
  cloneModel('thermometer', 0.20, [-2.1, TABLE_TOP_Y + 0.08, -0.82], [0, 0, Math.PI/7]);

  /* Tongs across tray edges — procedural */
  buildTongs(-1.55, TABLE_TOP_Y + 0.03, -0.70, 0.25);
  buildTongs(-1.05, TABLE_TOP_Y + 0.03, -0.62, -0.15);

  /* Photos emerging from liquid in trays — liquid shader */
  const trayImgs = PRODUCT_ZONES.tray.images;
  const liquidPositions = [
    { x: -2.1, z: -0.85 },
    { x: -1.5, z: -0.85 },
    { x: -0.9, z: -0.85 },
  ];
  trayImgs.forEach((img, i) => {
    if (i >= liquidPositions.length) return;
    const lp = liquidPositions[i];
    const w = 0.38, h = 0.28;
    const mat = new THREE.ShaderMaterial({
      uniforms: {
        tPhoto:   { value: null },
        tNormal:  { value: drTextureCache['waternormal'] || new THREE.Texture() },
        uTime:    { value: 0 },
        uDevelop: { value: 0 },
      },
      vertexShader:   LiquidShader.vertexShader,
      fragmentShader: LiquidShader.fragmentShader,
      transparent: true,
      side: THREE.FrontSide,
    });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(lp.x, TABLE_TOP_Y + 0.02, lp.z);
    mesh.userData = { zone: 'tray', imgIndex: i, label: PRODUCT_ZONES.tray.label };
    drPhotoMeshes.push(mesh);
    drLiquidMeshes.push(mesh);
    drScene.add(mesh);

    /* Load texture and animate develop */
    drTextureLoader.load(img.src, tex => {
      tex.minFilter = THREE.LinearFilter; tex.generateMipmaps = false;
      mat.uniforms.tPhoto.value = tex;
      const start = Date.now() + i * 1800;
      (function develop() {
        const t = (Date.now() - start) / 3500;
        mat.uniforms.uDevelop.value = Math.max(0, Math.min(t, 1.0));
        if (t < 1) requestAnimationFrame(develop);
      })();
    }, undefined, () => {});
  });
}

/* ── ZONE 3: BACK WALL — photos pinned in grid ── */
function buildZoneWall() {
  /* Cork pinboard on back wall */
  const board = new THREE.Mesh(
    new THREE.BoxGeometry(7.0, 3.2, 0.06),
    new THREE.MeshStandardMaterial({ color: 0x1e0e04, roughness: 0.97, metalness: 0.0 })
  );
  board.position.set(0, 0.8, -8.82);
  board.receiveShadow = true; drScene.add(board);

  /* Photos pinned to wall in an intentional grid — not random */
  const wallImgs = PRODUCT_ZONES.wall.images;
  const cols = 3, rows = 3;
  const w = 1.0, h = 0.78;
  const gX = 1.18, gY = 1.0;
  const startX = -((cols-1) * gX) / 2;
  const startY = 0.8 + ((rows-1) * gY) / 2;

  wallImgs.forEach((img, i) => {
    if (i >= cols * rows) return;
    const col = i % cols;
    const row = Math.floor(i / cols);
    const tiltZ = (Math.random() - 0.5) * 0.05; /* very subtle tilt — not chaotic */

    const mesh = buildPhotoPlane(img.src, w, h);
    mesh.rotation.z = tiltZ;
    mesh.position.set(
      startX + col * gX,
      startY - row * gY,
      -8.78
    );
    mesh.userData = { zone: 'wall', imgIndex: i, label: PRODUCT_ZONES.wall.label };
    drPhotoMeshes.push(mesh);
    drScene.add(mesh);

    /* Pin top-centre of each photo */
    const pin = drModelCache['pin'] ? drModelCache['pin'].clone(true) : null;
    if (pin) {
      /* Scale pin properly */
      const pb = new THREE.Box3().setFromObject(pin);
      const ps = new THREE.Vector3(); pb.getSize(ps);
      const pmax = Math.max(ps.x, ps.y, ps.z);
      pin.scale.setScalar(pmax > 0 ? 0.06 / pmax : 0.005);
      pin.position.set(
        startX + col * gX,
        startY - row * gY + h/2 - 0.05,
        -8.74
      );
      pin.rotation.x = Math.PI / 2;
      drScene.add(pin);
    }
  });
}

/* ── Procedural tongs ── */
function buildTongs(x, y, z, rot) {
  const mat = new THREE.MeshStandardMaterial({ color: 0x0d0d0d, roughness: 0.55, metalness: 0.72 });
  const armGeo = new THREE.BoxGeometry(0.016, 0.26, 0.010);
  [-0.016, 0.016].forEach(ox => {
    const arm = new THREE.Mesh(armGeo, mat);
    arm.position.set(x+ox, y, z);
    arm.rotation.z = ox > 0 ? -0.16 : 0.16;
    arm.castShadow = true; drScene.add(arm);
  });
  const piv = new THREE.Mesh(new THREE.CylinderGeometry(0.010, 0.010, 0.022, 8), mat);
  piv.rotation.z = Math.PI/2;
  piv.position.set(x, y+0.09, z);
  drScene.add(piv);
}

/* ── Scroll hijack ── */
let drScrollBound = null;
let drTouchBound  = { start: null, move: null };
let _drTouchStartY = 0;

function onDrPageScroll(e) {
  e.preventDefault();
  const delta = e.deltaY || e.detail || 0;
  drScrollY = Math.max(0, Math.min(
    drScrollY + delta,
    DR_ZONE_SCROLL_PX * (ZONE_ORDER.length - 1)
  ));
  drScrollT = drScrollY / (DR_ZONE_SCROLL_PX * (ZONE_ORDER.length - 1));
  const newIdx = Math.round(drScrollT * (ZONE_ORDER.length - 1));
  if (newIdx !== currentZoneIdx) {
    currentZoneIdx = newIdx;
    updateZoneUI(currentZoneIdx);
    if (typeof triggerGLGlitch === 'function') triggerGLGlitch(80);
  }
}

function onDrTouchStartPage(e) {
  _drTouchStartY = e.touches[0].clientY;
  drTargetParaX  = ((e.touches[0].clientX / window.innerWidth) * 2 - 1) * 0.5;
}

function onDrTouchMovePage(e) {
  e.preventDefault();
  const dy = _drTouchStartY - e.touches[0].clientY;
  drScrollY = Math.max(0, Math.min(
    drScrollY + dy * 1.5,
    DR_ZONE_SCROLL_PX * (ZONE_ORDER.length - 1)
  ));
  _drTouchStartY = e.touches[0].clientY;
  drScrollT = drScrollY / (DR_ZONE_SCROLL_PX * (ZONE_ORDER.length - 1));
  const newIdx = Math.round(drScrollT * (ZONE_ORDER.length - 1));
  if (newIdx !== currentZoneIdx) {
    currentZoneIdx = newIdx;
    updateZoneUI(currentZoneIdx);
  }
  drTargetParaX = ((e.touches[0].clientX / window.innerWidth) * 2 - 1) * 0.5;
  drTargetParaY = -((e.touches[0].clientY / window.innerHeight) * 2 - 1) * 0.3;
}

function attachScrollHijack() {
  drScrollBound        = onDrPageScroll;
  drTouchBound.start   = onDrTouchStartPage;
  drTouchBound.move    = onDrTouchMovePage;
  const pp = document.getElementById('product-page');
  pp.addEventListener('wheel',      drScrollBound,      { passive: false });
  pp.addEventListener('touchstart', drTouchBound.start, { passive: true  });
  pp.addEventListener('touchmove',  drTouchBound.move,  { passive: false });
}

function detachScrollHijack() {
  const pp = document.getElementById('product-page');
  if (drScrollBound)      pp.removeEventListener('wheel',      drScrollBound);
  if (drTouchBound.start) pp.removeEventListener('touchstart', drTouchBound.start);
  if (drTouchBound.move)  pp.removeEventListener('touchmove',  drTouchBound.move);
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

/* ── Mouse ── */
function onDrMouseMove(e) {
  if (!isDarkroomOpen) return;
  drTargetParaX = ((e.clientX/window.innerWidth)*2-1)*0.7;
  drTargetParaY = -((e.clientY/window.innerHeight)*2-1)*0.35;
  drMouse.set((e.clientX/window.innerWidth)*2-1, -((e.clientY/window.innerHeight)*2-1));
}

function onDrClick(e) {
  if (!isDarkroomOpen || !drHovered) return;
  const { zone, imgIndex } = drHovered.userData;
  if (zone != null && imgIndex != null) openDarkroomViewer(zone, imgIndex);
}

/* ── Render loop ── */
let drTime = 0;
function darkroomRenderLoop() {
  if (!isDarkroomOpen) return;
  drAnimFrame = requestAnimationFrame(darkroomRenderLoop);
  drTime += 0.016;

  /* Liquid uniforms */
  drLiquidMeshes.forEach(m => {
    if (m.material.uniforms) m.material.uniforms.uTime.value = drTime;
  });

  /* Smooth parallax */
  drParallaxX += (drTargetParaX - drParallaxX) * 0.04;
  drParallaxY += (drTargetParaY - drParallaxY) * 0.04;

  /* Smooth scroll */
  drRenderT += (drScrollT - drRenderT) * 0.055;

  /* Camera position along spline */
  if (drSpline) {
    const sp  = scrollTtoSplineT(drRenderT);
    const pos = drSpline.getPointAt(Math.max(0, Math.min(1, sp)));
    drCamera.position.copy(pos);
    drCamera.position.x += drParallaxX * 0.25;
    drCamera.position.y += drParallaxY * 0.18;

    /* Interpolate lookAt */
    const zF  = drRenderT * (ZONE_ORDER.length - 1);
    const lo  = Math.max(0, Math.min(ZONE_ORDER.length-2, Math.floor(zF)));
    const fr  = zF - lo;
    const la0 = PRODUCT_ZONES[ZONE_ORDER[lo]].cameraLookAt;
    const la1 = PRODUCT_ZONES[ZONE_ORDER[Math.min(ZONE_ORDER.length-1, lo+1)]].cameraLookAt;
    const lookAt = new THREE.Vector3().lerpVectors(la0, la1, fr);
    lookAt.x += drParallaxX * 0.1;
    lookAt.y += drParallaxY * 0.1;
    drCamera.lookAt(lookAt);
  }

  /* Raycaster hover */
  drRaycaster.setFromCamera(drMouse, drCamera);
  const hits = drRaycaster.intersectObjects(drPhotoMeshes, false);
  const canvas = document.getElementById('darkroom-canvas');
  drHovered = hits.length > 0 ? hits[0].object : null;
  if (canvas) canvas.style.cursor = drHovered ? 'pointer' : 'default';

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
  drViewerZone = zone; drViewerIdx = idx;
  const imgs   = PRODUCT_ZONES[zone].images;
  const viewer = document.getElementById('darkroom-viewer');
  const img    = document.getElementById('darkroom-viewer-img');
  const meta   = document.getElementById('darkroom-viewer-meta');
  img.src = imgs[idx].src; img.alt = imgs[idx].alt;
  img.style.animation = 'none'; img.offsetHeight;
  img.style.animation = 'dr-develop 1.2s ease forwards';
  meta.textContent = PRODUCT_ZONES[zone].label + ' // ' + (idx+1) + ' / ' + imgs.length;
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
    initDarkroom();
    if (window.innerWidth <= 900) drRenderer.setPixelRatio(1);

    const mobileEl = document.getElementById('darkroom-mobile');
    if (mobileEl) mobileEl.style.display = 'none';
    const canvas = document.getElementById('darkroom-canvas');
    if (canvas) canvas.style.display = 'block';

    /* Reset scroll */
    drScrollY = 0; drScrollT = 0; drRenderT = 0;
    currentZoneIdx = 0; drParallaxX = 0; drParallaxY = 0;
    drTargetParaX  = 0; drTargetParaY = 0;

    canvas.addEventListener('mousemove', onDrMouseMove);
    canvas.addEventListener('click',     onDrClick);

    attachScrollHijack();
    updateZoneUI(0);

    /* Intro: start far, settle to zone 0 */
    const z0 = PRODUCT_ZONES.enlarger;
    drCamera.position.set(z0.cameraPos.x, z0.cameraPos.y + 1.8, z0.cameraPos.z + 5);
    drCamera.lookAt(z0.cameraLookAt);

    if (!drAssetsLoaded) {
      darkroomRenderLoop();
      await buildDarkroomScene();
    }
    darkroomRenderLoop();

    /* Smooth intro zoom */
    const introStart = Date.now();
    const startPos   = drCamera.position.clone();
    (function introZoom() {
      const elapsed = (Date.now() - introStart) / 1200;
      if (elapsed >= 1 || drScrollT > 0.02) return;
      const ease = elapsed * elapsed * (3 - 2 * elapsed);
      drCamera.position.lerpVectors(startPos, z0.cameraPos, ease);
      drCamera.lookAt(z0.cameraLookAt);
      requestAnimationFrame(introZoom);
    })();

  } else {
    if (drAnimFrame) { cancelAnimationFrame(drAnimFrame); drAnimFrame = null; }
    const canvas = document.getElementById('darkroom-canvas');
    canvas.removeEventListener('mousemove', onDrMouseMove);
    canvas.removeEventListener('click',     onDrClick);
    detachScrollHijack();
    closeDarkroomViewer();
  }
}
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
