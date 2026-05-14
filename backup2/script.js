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
   Premium rebuild: EffectComposer + UnrealBloom + FilmPass
   + custom vignette shader + mobile vertical scroll UI
════════════════════════════════════════════════════════ */

const PRODUCT_ZONES = {
  contact:  { label: 'SOLE // LP SNEAKERS',       images: [
    { src: 'images/product-louis-philippe-sneaker-side-profile-studio-1.webp',  alt: 'Louis Philippe sneaker side profile' },
    { src: 'images/product-louis-philippe-sneaker-sole-detail-studio-2.webp',   alt: 'Louis Philippe sneaker sole detail' },
    { src: 'images/product-louis-philippe-sneaker-heel-suede-detail-3.webp',    alt: 'Louis Philippe sneaker heel suede' },
    { src: 'images/product-louis-philippe-sneaker-toe-logo-macro-4.webp',       alt: 'Louis Philippe sneaker toe logo' },
    { src: 'images/product-louis-philippe-sneaker-sole-bottom-studio-5.webp',   alt: 'Louis Philippe sneaker sole bottom' },
    { src: 'images/product-louis-philippe-sneaker-pair-front-angle-6.webp',     alt: 'Louis Philippe sneaker pair front' },
    { src: 'images/product-louis-philippe-sneaker-pair-top-overhead-7.webp',    alt: 'Louis Philippe sneaker pair overhead' },
    { src: 'images/product-louis-philippe-sneaker-pair-rear-angle-8.webp',      alt: 'Louis Philippe sneaker pair rear' },
  ]},
  tray:     { label: 'WOVEN // NATURAL FIBRE',    images: [
    { src: 'images/product-woven-basket-forest-editorial-bangalore-1.webp',       alt: 'Woven basket forest editorial' },
    { src: 'images/product-woven-basket-bougainvillea-lifestyle-bangalore-2.webp', alt: 'Woven basket bougainvillea' },
    { src: 'images/product-woven-tote-basket-dried-flowers-studio-3.webp',        alt: 'Woven tote dried flowers' },
    { src: 'images/product-woven-basket-overhead-citrus-4.webp',                  alt: 'Woven basket overhead citrus' },
    { src: 'images/product-woven-crossbody-bag-spotlight-studio-5.webp',          alt: 'Woven crossbody bag spotlight' },
    { src: 'images/product-woven-open-basket-lifestyle-bangalore-6.webp',         alt: 'Open weave basket lifestyle' },
    { src: 'images/product-natural-fibre-mat-table-setting-brass-7.webp',         alt: 'Natural fibre mat brass setting' },
  ]},
  line:     { label: 'DRAPE // LP TIES',          images: [
    { src: 'images/product-louis-philippe-tie-box-flatlay-studio-1.webp',     alt: 'Louis Philippe tie box flatlay' },
    { src: 'images/product-louis-philippe-tie-set-pedestal-studio-2.webp',    alt: 'Louis Philippe tie set pedestal' },
    { src: 'images/product-louis-philippe-navy-tie-rolled-wire-grid-3.webp',  alt: 'Louis Philippe navy tie rolled' },
    { src: 'images/product-louis-philippe-burgundy-tie-curved-paper-4.webp',  alt: 'Louis Philippe burgundy tie' },
    { src: 'images/product-louis-philippe-belt-wallet-wood-5.webp',           alt: 'Louis Philippe belt wallet wood' },
  ]},
  enlarger: { label: 'LENS // VISIONEXPRESS',     images: [
    { src: 'images/product-visionexpress-frames-sunclip-flatlay-1.webp',      alt: 'VisionExpress frames sunclip flatlay' },
    { src: 'images/product-visionexpress-frames-lens-macro-detail-2.webp',    alt: 'VisionExpress frames lens macro' },
    { src: 'images/product-visionexpress-frames-front-face-studio-3.webp',    alt: 'VisionExpress frames front face' },
    { src: 'images/product-visionexpress-frames-temple-side-profile-4.webp',  alt: 'VisionExpress frames temple profile' },
    { src: 'images/product-visionexpress-frames-sunclip-3quarter-5.webp',     alt: 'VisionExpress frames sunclip 3/4' },
  ]},
  wall:     { label: 'VESSEL // MACCLITE',        images: [
    { src: 'images/product-macclite-wok-overhead-blue-studio-1.webp',         alt: 'MACclite blue wok overhead' },
    { src: 'images/product-macclite-wok-angled-dramatic-studio-2.webp',       alt: 'MACclite wok dramatic angled' },
    { src: 'images/product-macclite-crepe-pan-side-profile-studio-3.webp',    alt: 'MACclite crepe pan profile' },
    { src: 'images/product-macclite-tawa-frontal-studio-4.webp',              alt: 'MACclite tawa frontal' },
    { src: 'images/product-macclite-pan-handle-macro-detail-5.webp',          alt: 'MACclite pan handle macro' },
    { src: 'images/product-macclite-pan-kitchen-counter-lifestyle-6.webp',    alt: 'MACclite pan kitchen counter' },
    { src: 'images/product-macclite-tawa-overhead-burlap-lifestyle-7.webp',   alt: 'MACclite tawa overhead burlap' },
    { src: 'images/product-macclite-wok-overhead-props-lifestyle-8.webp',     alt: 'MACclite wok overhead props' },
    { src: 'images/product-macclite-pan-uttapam-food-styling-9.webp',         alt: 'MACclite pan uttapam food' },
  ]}
};

const ZONE_ORDER = ['contact', 'tray', 'line', 'enlarger', 'wall'];

const ZONE_CAMERAS = {
  contact:  { x: 0,    y: 0.5,  z: 5.5 },
  tray:     { x: -2.5, y: -0.8, z: 4.5 },
  line:     { x: 0,    y: 2.0,  z: 4.5 },
  enlarger: { x: 2.8,  y: -0.8, z: 4.5 },
  wall:     { x: -5,   y: 0.2,  z: 3.5 },
};

/* ── Custom vignette + tone mapping shader ── */
const VignetteShader = {
  uniforms: {
    tDiffuse:  { value: null },
    offset:    { value: 0.95 },
    darkness:  { value: 1.8 },
    redTint:   { value: 0.06 },
  },
  vertexShader: `
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float offset;
    uniform float darkness;
    uniform float redTint;
    varying vec2 vUv;
    void main() {
      vec4 color = texture2D(tDiffuse, vUv);
      // Vignette
      vec2 uv = vUv * (1.0 - vUv.yx);
      float vig = uv.x * uv.y * 15.0;
      vig = pow(vig, offset);
      // Red tint overlay
      color.r = min(1.0, color.r + redTint);
      // Apply vignette darkening
      color.rgb *= mix(1.0 - darkness * 0.5, 1.0, vig);
      gl_FragColor = color;
    }
  `
};

/* ── Darkroom state ── */
let drRenderer, drScene, drCamera;
let drComposer;            // EffectComposer
let drBloomPass;           // UnrealBloomPass
let drAnimFrame = null;
let isDarkroomOpen = false;
let drMeshes = [];
let drHovered = null;
let drRaycaster, drMouse;
let drTargetCamX = 0, drTargetCamY = 0;
let drCamX = 0, drCamY = 0;
let drTextureCache = {};
let drViewerZone = null, drViewerIndex = 0;
let currentZoneIdx = 0;
let drTargetPos = { ...ZONE_CAMERAS['contact'] };
let drTouchStartX = 0, drTouchStartY = 0;
let drInited = false;

const drCanvas   = document.getElementById('darkroom-canvas');
const drLabel    = document.getElementById('darkroom-label');
const drHint     = document.getElementById('darkroom-hint');
const drViewer   = document.getElementById('darkroom-viewer');
const drViewerImg  = document.getElementById('darkroom-viewer-img');
const drViewerMeta = document.getElementById('darkroom-viewer-meta');
const drMobileEl = document.getElementById('darkroom-mobile');

/* ── Detect mobile ── */
const isMobile = () => window.innerWidth <= 768;

/* ═══════════════════════════════════════════════════════
   DESKTOP: Full 3D scene with post-processing
════════════════════════════════════════════════════════ */
function initDarkroom() {
  if (!window.THREE || drInited) return;
  drInited = true;

  /* Renderer */
  drRenderer = new THREE.WebGLRenderer({ canvas: drCanvas, antialias: true, powerPreference: 'high-performance' });
  drRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  drRenderer.setSize(window.innerWidth, window.innerHeight);
  drRenderer.setClearColor(0x000000, 1);
  drRenderer.toneMapping = THREE.ACESFilmicToneMapping;
  drRenderer.toneMappingExposure = 1.0;
  drRenderer.shadowMap.enabled = true;
  drRenderer.shadowMap.type = THREE.PCFSoftShadowMap;

  /* Scene */
  drScene = new THREE.Scene();
  drScene.fog = new THREE.FogExp2(0x080001, 0.055);

  /* Camera */
  drCamera = new THREE.PerspectiveCamera(52, window.innerWidth / window.innerHeight, 0.1, 100);
  drCamera.position.set(0, 0.5, 5.5);

  drRaycaster = new THREE.Raycaster();
  drMouse = new THREE.Vector2();

  /* ── Premium Lighting ── */

  // Very dark ambient — just enough to see room edges
  const ambient = new THREE.AmbientLight(0x110003, 2.0);
  drScene.add(ambient);

  // PRIMARY: Red safelight overhead — warm, diffuse
  const safelight = new THREE.PointLight(0xff2200, 3.5, 22);
  safelight.position.set(0, 5, 1);
  safelight.castShadow = true;
  safelight.shadow.mapSize.width = 512;
  safelight.shadow.mapSize.height = 512;
  safelight.shadow.camera.near = 0.5;
  safelight.shadow.camera.far = 25;
  drScene.add(safelight);

  // SECONDARY: Dim red fill from front-low — lifts shadows slightly
  const frontFill = new THREE.PointLight(0xcc1100, 0.8, 14);
  frontFill.position.set(0, -1, 6);
  drScene.add(frontFill);

  // ACCENT: Chemical tray glow — warm orange-red from below left
  const trayGlow = new THREE.PointLight(0xff3300, 0.6, 8);
  trayGlow.position.set(-2, -2, 2);
  drScene.add(trayGlow);

  // ENLARGER: Tight warm white cone over right table
  const enlargerLight = new THREE.SpotLight(0xfff8e7, 3.0, 9, Math.PI / 9, 0.35, 1.5);
  enlargerLight.position.set(2.8, 4, 0.5);
  enlargerLight.target.position.set(2.8, -1.5, -1);
  enlargerLight.castShadow = true;
  enlargerLight.shadow.mapSize.width = 512;
  enlargerLight.shadow.mapSize.height = 512;
  drScene.add(enlargerLight);
  drScene.add(enlargerLight.target);

  /* Build room & zones */
  buildRoom();
  buildContactSheet();
  buildDryingLine();
  buildDevelopingTray();
  buildEnlargerTable();
  buildSideWall();

  /* ── Post-processing pipeline ── */
  drComposer = new THREE.EffectComposer(drRenderer);

  const renderPass = new THREE.RenderPass(drScene, drCamera);
  drComposer.addPass(renderPass);

  // Bloom — glowing safelight halo, photo highlights bleeding
  drBloomPass = new THREE.UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    0.55,   // strength
    0.6,    // radius
    0.78    // threshold — only bright reds bloom
  );
  drComposer.addPass(drBloomPass);

  // Film grain + scanlines — analog texture
  const filmPass = new THREE.FilmPass(
    0.28,   // noise intensity
    0.05,   // scanline intensity
    648,    // scanline count
    false   // greyscale
  );
  drComposer.addPass(filmPass);

  // Vignette + red tone
  const vigPass = new THREE.ShaderPass(VignetteShader);
  vigPass.renderToScreen = true;
  drComposer.addPass(vigPass);

  window.addEventListener('resize', onDrResize);
}

function buildRoom() {
  // PBR-style dark walls with subtle roughness
  const wallMat  = new THREE.MeshStandardMaterial({ color: 0x060103, roughness: 0.95, metalness: 0.0, side: THREE.BackSide });
  const floorMat = new THREE.MeshStandardMaterial({ color: 0x080204, roughness: 0.98, metalness: 0.0 });

  // Back wall
  const back = new THREE.Mesh(new THREE.PlaneGeometry(24, 12), wallMat);
  back.position.set(0, 0, -7); drScene.add(back);

  // Floor
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(24, 24), floorMat);
  floor.rotation.x = -Math.PI / 2; floor.position.y = -3.2;
  floor.receiveShadow = true; drScene.add(floor);

  // Ceiling
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(24, 24), new THREE.MeshStandardMaterial({ color: 0x040102, roughness: 1.0 }));
  ceil.rotation.x = Math.PI / 2; ceil.position.y = 5.5; drScene.add(ceil);

  // Left wall
  const left = new THREE.Mesh(new THREE.PlaneGeometry(24, 12), wallMat);
  left.rotation.y = Math.PI / 2; left.position.set(-8, 0, 0); drScene.add(left);

  // Right wall
  const right = new THREE.Mesh(new THREE.PlaneGeometry(24, 12), wallMat);
  right.rotation.y = -Math.PI / 2; right.position.set(8, 0, 0); drScene.add(right);

  // Safelight bulb mesh — glowing red sphere
  const bulbGeo = new THREE.SphereGeometry(0.08, 12, 8);
  const bulbMat = new THREE.MeshBasicMaterial({ color: 0xff3300 });
  const bulb = new THREE.Mesh(bulbGeo, bulbMat);
  bulb.position.set(0, 4.9, 1); drScene.add(bulb);

  // Wire from ceiling to bulb
  const wirePts = [new THREE.Vector3(0, 5.5, 1), new THREE.Vector3(0, 4.9, 1)];
  const wire = new THREE.Line(new THREE.BufferGeometry().setFromPoints(wirePts), new THREE.LineBasicMaterial({ color: 0x222222 }));
  drScene.add(wire);

  // Developing tables
  buildTable(-2.5, -2.4, -1.2);
  buildTable( 2.8, -2.4, -1.2);

  // Enlarger column
  const engMat = new THREE.MeshStandardMaterial({ color: 0x0d0d0d, roughness: 0.8, metalness: 0.2 });
  const col = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 3.0, 10), engMat);
  col.position.set(2.8, -0.9, -1.5); drScene.add(col);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.28, 0.42), engMat);
  head.position.set(2.8, 0.6, -1.5); drScene.add(head);

  // Drying wires
  [[0.5],[-0.5]].forEach(([z]) => {
    const pts = [new THREE.Vector3(-5, 2.4, z), new THREE.Vector3(5, 2.4, z)];
    drScene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: 0x2a2a2a })));
  });
}

function buildTable(x, y, z) {
  const mat = new THREE.MeshStandardMaterial({ color: 0x0b0806, roughness: 0.9, metalness: 0.05 });
  const top = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.07, 1.3), mat);
  top.position.set(x, y + 0.035, z);
  top.receiveShadow = true; top.castShadow = true; drScene.add(top);
  [[-0.9,-0.45],[-0.9,0.45],[0.9,-0.45],[0.9,0.45]].forEach(([ox,oz]) => {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.2, 0.06), mat);
    leg.position.set(x + ox, y - 0.6, z + oz);
    leg.castShadow = true; drScene.add(leg);
  });
}

/* ── Zone builders ── */
function buildContactSheet() {
  const images = PRODUCT_ZONES.contact.images;
  const cols = 4, rows = 2, w = 0.88, h = 0.62, gX = 1.06, gY = 0.78;
  const sX = -((cols-1)*gX)/2, sY = ((rows-1)*gY)/2 + 0.6;
  images.forEach((img, i) => {
    const mesh = makeImagePlane(img.src, w, h);
    mesh.position.set(sX + (i%cols)*gX, sY - Math.floor(i/cols)*gY, -6.8);
    mesh.userData = { zone:'contact', imgIndex:i, label:PRODUCT_ZONES.contact.label };
    drScene.add(mesh); drMeshes.push(mesh);
    const pin = new THREE.Mesh(new THREE.CircleGeometry(0.022,8), new THREE.MeshBasicMaterial({ color:0x1a1a1a }));
    pin.position.set(sX+(i%cols)*gX, sY-Math.floor(i/cols)*gY+h/2+0.04, -6.78);
    drScene.add(pin);
  });
}

function buildDryingLine() {
  const images = PRODUCT_ZONES.line.images;
  const spacing = 1.7, sX = -((images.length-1)*spacing)/2;
  const rots = [-0.07,0.04,-0.03,0.06,-0.05];
  images.forEach((img, i) => {
    const mesh = makeImagePlane(img.src, 0.65, 1.0);
    mesh.position.set(sX + i*spacing, 1.6, 0.5);
    mesh.rotation.z = rots[i%rots.length];
    mesh.userData = { zone:'line', imgIndex:i, label:PRODUCT_ZONES.line.label };
    drScene.add(mesh); drMeshes.push(mesh);
    const clip = new THREE.Mesh(new THREE.BoxGeometry(0.055,0.11,0.035), new THREE.MeshStandardMaterial({ color:0x1a100a, roughness:0.7 }));
    clip.position.set(sX+i*spacing, 2.4, 0.5); drScene.add(clip);
    const string = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(sX+i*spacing,2.4,0.5),new THREE.Vector3(sX+i*spacing,1.6+0.5,0.5)]), new THREE.LineBasicMaterial({color:0x333333}));
    drScene.add(string);
  });
}

function buildDevelopingTray() {
  const images = PRODUCT_ZONES.tray.images;
  const trayMat = new THREE.MeshStandardMaterial({ color:0x080812, roughness:0.9, metalness:0.1 });
  const tray = new THREE.Mesh(new THREE.BoxGeometry(1.9,0.055,1.05), trayMat);
  tray.position.set(-2.5,-2.37,-1.2); drScene.add(tray);
  [[0.95,0,0.055,1.05],[-0.95,0,0.055,1.05],[0,0.53,1.9,0.055],[0,-0.53,1.9,0.055]].forEach(([ox,oz,sw,sd]) => {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(sw,0.11,sd), trayMat);
    wall.position.set(-2.5+ox,-2.31,-1.2+oz); drScene.add(wall);
  });
  const positions = [[-0.35,-0.25],[0.35,-0.25],[-0.35,0.2],[0.35,0.2],[0,-0.02],[-0.2,0.35],[0.2,0.35]];
  images.forEach((img, i) => {
    if (i >= positions.length) return;
    const mesh = makeImagePlane(img.src, 0.44, 0.54);
    mesh.rotation.x = -Math.PI/2;
    mesh.rotation.z = (Math.random()-0.5)*0.28;
    mesh.position.set(-2.5+positions[i][0],-2.33,-1.2+positions[i][1]);
    mesh.userData = { zone:'tray', imgIndex:i, label:PRODUCT_ZONES.tray.label };
    drScene.add(mesh); drMeshes.push(mesh);
  });
}

function buildEnlargerTable() {
  const images = PRODUCT_ZONES.enlarger.images;
  const pos = [[0,0],[-.5,-.2],[.5,-.2],[-.25,.25],[.25,.25]];
  const rots = [0,.14,-.09,.07,-.11];
  images.forEach((img, i) => {
    if (i >= pos.length) return;
    const mesh = makeImagePlane(img.src, 0.58, 0.44);
    mesh.rotation.x = -Math.PI/2; mesh.rotation.z = rots[i];
    mesh.position.set(2.8+pos[i][0],-2.36,-1.2+pos[i][1]);
    mesh.userData = { zone:'enlarger', imgIndex:i, label:PRODUCT_ZONES.enlarger.label };
    drScene.add(mesh); drMeshes.push(mesh);
  });
  const lMat = new THREE.MeshStandardMaterial({ color:0x1a1a1a, roughness:0.6, metalness:0.3 });
  const lb = new THREE.Mesh(new THREE.CylinderGeometry(0.13,0.13,0.055,16), lMat);
  lb.position.set(2.8,-2.32,-1.2); drScene.add(lb);
}

function buildSideWall() {
  const images = PRODUCT_ZONES.wall.images;
  const cols=3, rows=3, w=0.88, h=0.78, gX=1.02, gY=0.94;
  const sY = ((rows-1)*gY)/2+0.3, wallZ = -(gX*(cols-1))/2;
  images.forEach((img, i) => {
    if (i >= cols*rows) return;
    const mesh = makeImagePlane(img.src, w, h);
    mesh.rotation.y = Math.PI/2;
    mesh.rotation.z = (Math.random()-0.5)*0.05;
    mesh.position.set(-7.8, sY-Math.floor(i/cols)*gY, wallZ+(i%cols)*gX);
    mesh.userData = { zone:'wall', imgIndex:i, label:PRODUCT_ZONES.wall.label };
    drScene.add(mesh); drMeshes.push(mesh);
    const tape = new THREE.Mesh(new THREE.PlaneGeometry(0.16,0.035), new THREE.MeshBasicMaterial({color:0x181818,transparent:true,opacity:0.5}));
    tape.rotation.y = Math.PI/2; tape.position.set(-7.75, sY-Math.floor(i/cols)*gY+h/2+0.025, wallZ+(i%cols)*gX);
    drScene.add(tape);
  });
}

/* ── Image plane factory ── */
function makeImagePlane(src, w, h) {
  const mat = new THREE.MeshBasicMaterial({ color:0x180005, transparent:true, opacity:0.75 });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  if (drTextureCache[src]) {
    applyTexture(mesh, drTextureCache[src]);
  } else {
    new THREE.TextureLoader().load(src, tex => {
      drTextureCache[src] = tex; applyTexture(mesh, tex);
    }, undefined, () => {});
  }
  return mesh;
}

function applyTexture(mesh, tex) {
  tex.minFilter = THREE.LinearFilter; tex.generateMipmaps = false;
  mesh.material = new THREE.MeshBasicMaterial({ map:tex, transparent:true, opacity:0.0, color:0xfff0f0 });
  const start = performance.now();
  (function fadeIn() {
    const t = (performance.now()-start)/2000;
    mesh.material.opacity = Math.min(t, 0.9);
    if (t < 1) requestAnimationFrame(fadeIn);
    else mesh.material.opacity = 0.9;
  })();
}

/* ── Zone navigation ── */
function navigateToZone(idx) {
  idx = Math.max(0, Math.min(ZONE_ORDER.length-1, idx));
  currentZoneIdx = idx;
  drTargetPos = { ...ZONE_CAMERAS[ZONE_ORDER[idx]] };
  const label = PRODUCT_ZONES[ZONE_ORDER[idx]]?.label || '';
  drLabel.textContent = label; drLabel.style.opacity = '1';
  setTimeout(() => { drLabel.style.opacity = '0'; }, 2200);
  // Update dots
  document.querySelectorAll('.dr-zone-dot').forEach((d,i) => d.classList.toggle('active', i===idx));
}

/* ── Mouse/touch interaction ── */
let drMouseX = 0, drMouseY = 0;

function onDrMouseMove(e) {
  if (!isDarkroomOpen) return;
  drMouseX = (e.clientX/window.innerWidth)*2-1;
  drMouseY = (e.clientY/window.innerHeight)*2-1;
  drTargetCamX = drMouseX * 1.0;
  drTargetCamY = -drMouseY * 0.5;
  drMouse.set(drMouseX, -drMouseY);
  drRaycaster.setFromCamera(drMouse, drCamera);
  const hits = drRaycaster.intersectObjects(drMeshes);
  if (hits.length > 0) {
    const hit = hits[0].object;
    if (drHovered !== hit) { drHovered = hit; drLabel.textContent = hit.userData.label||''; drLabel.style.opacity='1'; drCanvas.style.cursor='pointer'; }
  } else { drHovered=null; drLabel.style.opacity='0'; drCanvas.style.cursor='default'; }
}

function onDrClick(e) {
  if (!isDarkroomOpen || !drHovered) return;
  const {zone,imgIndex} = drHovered.userData;
  if (zone) openDarkroomViewer(zone, imgIndex);
}

function onDrTouchStart(e) { drTouchStartX=e.touches[0].clientX; drTouchStartY=e.touches[0].clientY; }
function onDrTouchMove(e) {
  if (!isDarkroomOpen) return;
  drMouseX = (e.touches[0].clientX/window.innerWidth)*2-1;
  drMouseY = (e.touches[0].clientY/window.innerHeight)*2-1;
  drTargetCamX = drMouseX*1.0; drTargetCamY = -drMouseY*0.5;
}
function onDrTouchEnd(e) {
  if (!isDarkroomOpen) return;
  const dx = e.changedTouches[0].clientX - drTouchStartX;
  const dy = e.changedTouches[0].clientY - drTouchStartY;
  if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 40) navigateToZone(currentZoneIdx + (dx<0?1:-1));
}
function onDrWheel(e) { if (!isDarkroomOpen) return; e.preventDefault(); navigateToZone(currentZoneIdx+(e.deltaY>0?1:-1)); }

/* ── Viewer ── */
function openDarkroomViewer(zone, imgIndex) {
  drViewerZone=zone; drViewerIndex=imgIndex;
  const imgs = PRODUCT_ZONES[zone].images;
  drViewerImg.src=imgs[imgIndex].src; drViewerImg.alt=imgs[imgIndex].alt;
  drViewerMeta.textContent=`${PRODUCT_ZONES[zone].label} // ${imgIndex+1} / ${imgs.length}`;
  drViewer.classList.add('active');
}
function closeDarkroomViewer() { drViewer.classList.remove('active'); }

document.getElementById('darkroom-viewer-prev').addEventListener('click',()=>{
  if(!drViewerZone)return;
  const imgs=PRODUCT_ZONES[drViewerZone].images;
  drViewerIndex=(drViewerIndex-1+imgs.length)%imgs.length; openDarkroomViewer(drViewerZone,drViewerIndex);
});
document.getElementById('darkroom-viewer-next').addEventListener('click',()=>{
  if(!drViewerZone)return;
  const imgs=PRODUCT_ZONES[drViewerZone].images;
  drViewerIndex=(drViewerIndex+1)%imgs.length; openDarkroomViewer(drViewerZone,drViewerIndex);
});

/* ── Render loop ── */
function darkroomRenderLoop() {
  if (!isDarkroomOpen) return;
  drAnimFrame = requestAnimationFrame(darkroomRenderLoop);
  drCamX += (drTargetCamX-drCamX)*0.035;
  drCamY += (drTargetCamY-drCamY)*0.035;
  drCamera.position.x += (drTargetPos.x+drCamX*0.7-drCamera.position.x)*0.038;
  drCamera.position.y += (drTargetPos.y+drCamY*0.35-drCamera.position.y)*0.038;
  drCamera.position.z += (drTargetPos.z-drCamera.position.z)*0.038;
  drCamera.lookAt(drTargetPos.x+drCamX*0.15, drTargetPos.y+drCamY*0.1, 0);
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

/* ═══════════════════════════════════════════════════════
   MOBILE: Vertical scroll darkroom — one photo at a time
   Photos develop (fade in) as they enter the viewport.
════════════════════════════════════════════════════════ */
function buildMobileDarkroom() {
  drMobileEl.innerHTML = '';
  ZONE_ORDER.forEach(zoneKey => {
    const zone = PRODUCT_ZONES[zoneKey];
    const section = document.createElement('div');
    section.className = 'dr-mobile-zone';
    const label = document.createElement('span');
    label.className = 'dr-mobile-zone-label';
    label.textContent = zone.label;
    section.appendChild(label);
    const photos = document.createElement('div');
    photos.className = 'dr-mobile-photos';
    zone.images.forEach((img, i) => {
      const wrap = document.createElement('div');
      wrap.className = 'dr-mobile-photo';
      const el = document.createElement('img');
      el.src = img.src; el.alt = img.alt; el.loading = 'lazy';
      // Click opens viewer
      wrap.addEventListener('click', () => openDarkroomViewer(zoneKey, i));
      wrap.appendChild(el);
      photos.appendChild(wrap);
    });
    section.appendChild(photos);
    drMobileEl.appendChild(section);
  });

  // IntersectionObserver — develop photos as they scroll into view
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const img = entry.target.querySelector('img');
        if (img) setTimeout(() => img.classList.add('developed'), 80);
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15 });

  drMobileEl.querySelectorAll('.dr-mobile-photo').forEach(el => observer.observe(el));
}

/* ── Toggle ── */
function toggleProductGallery(open) {
  isDarkroomOpen = open;
  const productPage = document.getElementById('product-page');
  productPage.classList.toggle('active', open);
  document.body.style.overflow = open ? 'hidden' : 'auto';

  if (open) {
    if (isMobile()) {
      // Mobile: build scroll UI
      buildMobileDarkroom();
      drHint.textContent = 'SCROLL_TO_DEVELOP';
      drHint.style.opacity = '1';
      setTimeout(() => { drHint.style.opacity = '0'; }, 3000);
    } else {
      // Desktop: 3D scene
      currentZoneIdx = 0;
      drTargetPos = { ...ZONE_CAMERAS['contact'] };
      drCamX=0; drCamY=0; drTargetCamX=0; drTargetCamY=0;
      initDarkroom();
      drCanvas.addEventListener('mousemove', onDrMouseMove);
      drCanvas.addEventListener('click', onDrClick);
      drCanvas.addEventListener('touchstart', onDrTouchStart, {passive:true});
      drCanvas.addEventListener('touchmove', onDrTouchMove, {passive:true});
      drCanvas.addEventListener('touchend', onDrTouchEnd, {passive:true});
      drCanvas.addEventListener('wheel', onDrWheel, {passive:false});
      drHint.textContent = 'MOVE_TO_EXPLORE // CLICK_TO_DEVELOP';
      drHint.style.opacity = '1';
      setTimeout(() => { drHint.style.opacity = '0'; }, 3500);
      navigateToZone(0);
      darkroomRenderLoop();
    }
  } else {
    if (drAnimFrame) { cancelAnimationFrame(drAnimFrame); drAnimFrame=null; }
    drCanvas.removeEventListener('mousemove', onDrMouseMove);
    drCanvas.removeEventListener('click', onDrClick);
    drCanvas.removeEventListener('touchstart', onDrTouchStart);
    drCanvas.removeEventListener('touchmove', onDrTouchMove);
    drCanvas.removeEventListener('touchend', onDrTouchEnd);
    drCanvas.removeEventListener('wheel', onDrWheel);
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
