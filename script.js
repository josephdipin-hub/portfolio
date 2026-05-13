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
   Three.js 3D darkroom space. 5 zones, mouse-parallax camera.
   Darkness is intentional. Your photos are the only light.
   
   Zones:
     CONTACT SHEET — sneakers pinned to wall (back wall, flat grid)
     DEVELOPING TRAY — woven baskets face-down on table, hover reveals
     DRYING LINE — ties clipped to wire overhead
     ENLARGER TABLE — eyewear under loupe light (second table)
     SIDE WALL — cookware prints pinned at angle
════════════════════════════════════════════════════════ */

const PRODUCT_ZONES = {
  contact: {
    label: 'SOLE // LP SNEAKERS',
    images: [
      { src: 'images/product-louis-philippe-sneaker-side-profile-studio-1.webp',   alt: 'Louis Philippe sneaker side profile' },
      { src: 'images/product-louis-philippe-sneaker-sole-detail-studio-2.webp',    alt: 'Louis Philippe sneaker sole detail' },
      { src: 'images/product-louis-philippe-sneaker-heel-suede-detail-3.webp',     alt: 'Louis Philippe sneaker heel suede' },
      { src: 'images/product-louis-philippe-sneaker-toe-logo-macro-4.webp',        alt: 'Louis Philippe sneaker toe logo' },
      { src: 'images/product-louis-philippe-sneaker-sole-bottom-studio-5.webp',    alt: 'Louis Philippe sneaker sole bottom' },
      { src: 'images/product-louis-philippe-sneaker-pair-front-angle-6.webp',      alt: 'Louis Philippe sneaker pair front' },
      { src: 'images/product-louis-philippe-sneaker-pair-top-overhead-7.webp',     alt: 'Louis Philippe sneaker pair overhead' },
      { src: 'images/product-louis-philippe-sneaker-pair-rear-angle-8.webp',       alt: 'Louis Philippe sneaker pair rear' },
    ]
  },
  tray: {
    label: 'WOVEN // NATURAL FIBRE',
    images: [
      { src: 'images/product-woven-basket-forest-editorial-bangalore-1.webp',      alt: 'Woven basket forest editorial' },
      { src: 'images/product-woven-basket-bougainvillea-lifestyle-bangalore-2.webp', alt: 'Woven basket bougainvillea' },
      { src: 'images/product-woven-tote-basket-dried-flowers-studio-3.webp',       alt: 'Woven tote dried flowers' },
      { src: 'images/product-woven-basket-overhead-citrus-4.webp',                 alt: 'Woven basket overhead citrus' },
      { src: 'images/product-woven-crossbody-bag-spotlight-studio-5.webp',         alt: 'Woven crossbody bag spotlight' },
      { src: 'images/product-woven-open-basket-lifestyle-bangalore-6.webp',        alt: 'Open weave basket lifestyle' },
      { src: 'images/product-natural-fibre-mat-table-setting-brass-7.webp',        alt: 'Natural fibre mat brass setting' },
    ]
  },
  line: {
    label: 'DRAPE // LP TIES',
    images: [
      { src: 'images/product-louis-philippe-tie-box-flatlay-studio-1.webp',        alt: 'Louis Philippe tie box flatlay' },
      { src: 'images/product-louis-philippe-tie-set-pedestal-studio-2.webp',       alt: 'Louis Philippe tie set pedestal' },
      { src: 'images/product-louis-philippe-navy-tie-rolled-wire-grid-3.webp',     alt: 'Louis Philippe navy tie rolled' },
      { src: 'images/product-louis-philippe-burgundy-tie-curved-paper-4.webp',     alt: 'Louis Philippe burgundy tie' },
      { src: 'images/product-louis-philippe-belt-wallet-wood-5.webp',              alt: 'Louis Philippe belt wallet wood' },
    ]
  },
  enlarger: {
    label: 'LENS // VISIONEXPRESS',
    images: [
      { src: 'images/product-visionexpress-frames-sunclip-flatlay-1.webp',         alt: 'VisionExpress frames sunclip flatlay' },
      { src: 'images/product-visionexpress-frames-lens-macro-detail-2.webp',       alt: 'VisionExpress frames lens macro' },
      { src: 'images/product-visionexpress-frames-front-face-studio-3.webp',       alt: 'VisionExpress frames front face' },
      { src: 'images/product-visionexpress-frames-temple-side-profile-4.webp',     alt: 'VisionExpress frames temple profile' },
      { src: 'images/product-visionexpress-frames-sunclip-3quarter-5.webp',        alt: 'VisionExpress frames sunclip 3/4' },
    ]
  },
  wall: {
    label: 'VESSEL // MACCLITE',
    images: [
      { src: 'images/product-macclite-wok-overhead-blue-studio-1.webp',            alt: 'MACclite blue wok overhead' },
      { src: 'images/product-macclite-wok-angled-dramatic-studio-2.webp',          alt: 'MACclite wok dramatic angled' },
      { src: 'images/product-macclite-crepe-pan-side-profile-studio-3.webp',       alt: 'MACclite crepe pan profile' },
      { src: 'images/product-macclite-tawa-frontal-studio-4.webp',                 alt: 'MACclite tawa frontal' },
      { src: 'images/product-macclite-pan-handle-macro-detail-5.webp',             alt: 'MACclite pan handle macro' },
      { src: 'images/product-macclite-pan-kitchen-counter-lifestyle-6.webp',       alt: 'MACclite pan kitchen counter' },
      { src: 'images/product-macclite-tawa-overhead-burlap-lifestyle-7.webp',      alt: 'MACclite tawa overhead burlap' },
      { src: 'images/product-macclite-wok-overhead-props-lifestyle-8.webp',        alt: 'MACclite wok overhead props' },
      { src: 'images/product-macclite-pan-uttapam-food-styling-9.webp',            alt: 'MACclite pan uttapam food' },
    ]
  }
};

/* ── Darkroom state ─────────────────────────────────── */
let drRenderer, drScene, drCamera, drRaycaster, drMouse;
let drAnimFrame = null;
let isDarkroomOpen = false;
let drMeshes = [];           // { mesh, zone, imgIndex }
let drHovered = null;
let drTargetCamX = 0, drTargetCamY = 0;
let drCamX = 0, drCamY = 0;
let drTextureCache = {};
let drViewerZone = null;
let drViewerIndex = 0;

const drCanvas   = document.getElementById('darkroom-canvas');
const drLabel    = document.getElementById('darkroom-label');
const drHint     = document.getElementById('darkroom-hint');
const drViewer   = document.getElementById('darkroom-viewer');
const drViewerImg  = document.getElementById('darkroom-viewer-img');
const drViewerMeta = document.getElementById('darkroom-viewer-meta');

/* ── Build the darkroom scene ───────────────────────── */
function initDarkroom() {
  if (!window.THREE || drRenderer) return;

  drRenderer = new THREE.WebGLRenderer({ canvas: drCanvas, alpha: false, antialias: true });
  drRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  drRenderer.setSize(window.innerWidth, window.innerHeight);
  drRenderer.setClearColor(0x000000, 1);
  drRenderer.shadowMap.enabled = true;
  drRenderer.shadowMap.type = THREE.PCFSoftShadowMap;

  drScene  = new THREE.Scene();
  drScene.fog = new THREE.FogExp2(0x000000, 0.18);

  drCamera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 100);
  drCamera.position.set(0, 0, 5);

  drRaycaster = new THREE.Raycaster();
  drMouse = new THREE.Vector2();

  /* ── Lighting: single red safelight overhead ── */
  const ambient = new THREE.AmbientLight(0x1a0005, 1.2);
  drScene.add(ambient);

  // Red safelight — the only real light source
  const safelight = new THREE.PointLight(0x8B0000, 4.0, 20);
  safelight.position.set(0, 4, 2);
  safelight.castShadow = true;
  drScene.add(safelight);

  // Dim fill from below (chemical glow from trays)
  const trayGlow = new THREE.PointLight(0x2a0800, 1.2, 10);
  trayGlow.position.set(-1, -1.5, 3);
  drScene.add(trayGlow);

  // Soft red front fill — ensures photos are readable under safelight
  const frontFill = new THREE.PointLight(0x4a0000, 1.5, 15);
  frontFill.position.set(0, 1, 5);
  drScene.add(frontFill);

  // Enlarger cone of light — warm white, tight, over the right table
  const enlargerLight = new THREE.SpotLight(0xfff5e0, 1.8, 10, Math.PI / 8, 0.4);
  enlargerLight.position.set(2.5, 3, 1);
  enlargerLight.target.position.set(2.5, -1, 0);
  enlargerLight.castShadow = true;
  drScene.add(enlargerLight);
  drScene.add(enlargerLight.target);

  /* ── Room geometry ── */
  buildRoom();

  /* ── Place all zone images ── */
  buildContactSheet();   // back wall — sneakers
  buildDryingLine();     // overhead wire — ties
  buildDevelopingTray(); // table left — woven
  buildEnlargerTable();  // table right — eyewear
  buildSideWall();       // side wall — cookware

  /* ── Resize ── */
  window.addEventListener('resize', onDrResize);
}

function buildRoom() {
  const wallMat = new THREE.MeshLambertMaterial({ color: 0x050505, side: THREE.BackSide });

  // Back wall
  const backWall = new THREE.Mesh(new THREE.PlaneGeometry(20, 10), wallMat);
  backWall.position.set(0, 0, -6);
  drScene.add(backWall);

  // Floor
  const floorGeo = new THREE.PlaneGeometry(20, 20);
  const floorMat = new THREE.MeshLambertMaterial({ color: 0x080808 });
  const floor = new THREE.Mesh(floorGeo, floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -3;
  floor.receiveShadow = true;
  drScene.add(floor);

  // Ceiling
  const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(20, 20), new THREE.MeshLambertMaterial({ color: 0x030303 }));
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.y = 5;
  drScene.add(ceiling);

  // Left wall
  const leftWall = new THREE.Mesh(new THREE.PlaneGeometry(20, 10), wallMat);
  leftWall.rotation.y = Math.PI / 2;
  leftWall.position.set(-7, 0, 0);
  drScene.add(leftWall);

  // Developing table — left
  buildTable(-2.5, -2.2, -1);

  // Enlarger table — right
  buildTable(2.5, -2.2, -1);

  // Enlarger body (cylinder stack)
  const enlargerMat = new THREE.MeshLambertMaterial({ color: 0x111111 });
  const column = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.5, 8), enlargerMat);
  column.position.set(2.5, -0.5, -1.2);
  drScene.add(column);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.3, 0.4), enlargerMat);
  head.position.set(2.5, 0.6, -1.2);
  drScene.add(head);

  // Drying line wire
  const wireMat = new THREE.LineBasicMaterial({ color: 0x333333 });
  const wirePoints = [new THREE.Vector3(-4, 2.2, 0.5), new THREE.Vector3(4, 2.2, 0.5)];
  const wireGeo = new THREE.BufferGeometry().setFromPoints(wirePoints);
  drScene.add(new THREE.Line(wireGeo, wireMat));

  // Second wire line
  const wirePoints2 = [new THREE.Vector3(-4, 2.2, -0.5), new THREE.Vector3(4, 2.2, -0.5)];
  const wireGeo2 = new THREE.BufferGeometry().setFromPoints(wirePoints2);
  drScene.add(new THREE.Line(wireGeo2, wireMat));
}

function buildTable(x, y, z) {
  const mat = new THREE.MeshLambertMaterial({ color: 0x0c0a08 });
  // tabletop
  const top = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.08, 1.2), mat);
  top.position.set(x, y + 0.04, z);
  top.receiveShadow = true; top.castShadow = true;
  drScene.add(top);
  // legs
  const legPositions = [[-0.9, -0.5], [0.9, -0.5], [-0.9, 0.5], [0.9, 0.5]];
  legPositions.forEach(([lx, lz]) => {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.2, 0.06), mat);
    leg.position.set(x + lx, y - 0.6, z + lz);
    leg.castShadow = true;
    drScene.add(leg);
  });
}

/* ── Zone builders ──────────────────────────────────── */

// BACK WALL — contact sheet of sneakers in a grid
function buildContactSheet() {
  const images = PRODUCT_ZONES.contact.images;
  const cols = 4, rows = 2;
  const w = 0.9, h = 0.65, gapX = 1.05, gapY = 0.80;
  const startX = -((cols - 1) * gapX) / 2;
  const startY = ((rows - 1) * gapY) / 2 + 0.5;

  images.forEach((img, i) => {
    const col = i % cols, row = Math.floor(i / cols);
    const x = startX + col * gapX;
    const y = startY - row * gapY;
    const mesh = makeImagePlane(img.src, w, h);
    mesh.position.set(x, y, -5.8);
    mesh.userData = { zone: 'contact', imgIndex: i, label: PRODUCT_ZONES.contact.label };
    drScene.add(mesh);
    drMeshes.push(mesh);

    // Pin dot
    const pin = new THREE.Mesh(new THREE.CircleGeometry(0.025, 8), new THREE.MeshBasicMaterial({ color: 0x333333 }));
    pin.position.set(x, y + h / 2 + 0.04, -5.78);
    drScene.add(pin);
  });
}

// OVERHEAD WIRE — ties hanging with slight rotation variation
function buildDryingLine() {
  const images = PRODUCT_ZONES.line.images;
  const count = images.length;
  const spacing = 1.6;
  const startX = -((count - 1) * spacing) / 2;
  const rotations = [-0.08, 0.05, -0.03, 0.07, -0.05];

  images.forEach((img, i) => {
    const x = startX + i * spacing;
    const w = 0.7, h = 1.0;
    const mesh = makeImagePlane(img.src, w, h);
    mesh.position.set(x, 1.5, 0.5);
    mesh.rotation.z = rotations[i % rotations.length];
    mesh.userData = { zone: 'line', imgIndex: i, label: PRODUCT_ZONES.line.label };
    drScene.add(mesh);
    drMeshes.push(mesh);

    // Clothespin (small box)
    const clipMat = new THREE.MeshLambertMaterial({ color: 0x1a1208 });
    const clip = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.12, 0.04), clipMat);
    clip.position.set(x, 2.2, 0.5);
    drScene.add(clip);
  });
}

// LEFT TABLE — developing tray with woven baskets
function buildDevelopingTray() {
  const images = PRODUCT_ZONES.tray.images;

  // Tray
  const trayMat = new THREE.MeshLambertMaterial({ color: 0x0a0a12 });
  const tray = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.06, 1.0), trayMat);
  tray.position.set(-2.5, -2.1, -1);
  drScene.add(tray);

  // Tray walls
  [[0.9, 0, 0.06, 1.0], [-0.9, 0, 0.06, 1.0], [0, 0.5, 1.8, 0.06], [0, -0.5, 1.8, 0.06]]
    .forEach(([ox, oz, sw, sd]) => {
      const wall = new THREE.Mesh(new THREE.BoxGeometry(sw, 0.12, sd), trayMat);
      wall.position.set(-2.5 + ox, -2.04, -1 + oz);
      drScene.add(wall);
    });

  // Images laid in tray — slightly tilted, face-up
  const positions = [
    [-0.35, -0.25], [0.35, -0.25], [-0.35, 0.2],
    [0.35, 0.2],    [0, -0.02],    [-0.2, 0.35],
    [0.2, 0.35]
  ];
  images.forEach((img, i) => {
    if (i >= positions.length) return;
    const [ox, oz] = positions[i];
    const w = 0.42, h = 0.52;
    const mesh = makeImagePlane(img.src, w, h);
    mesh.rotation.x = -Math.PI / 2;
    mesh.rotation.z = (Math.random() - 0.5) * 0.3;
    mesh.position.set(-2.5 + ox, -2.04, -1 + oz);
    mesh.userData = { zone: 'tray', imgIndex: i, label: PRODUCT_ZONES.tray.label };
    drScene.add(mesh);
    drMeshes.push(mesh);
  });
}

// RIGHT TABLE — eyewear under enlarger light
function buildEnlargerTable() {
  const images = PRODUCT_ZONES.enlarger.images;
  const positions = [
    [0, 0, 0],         [-0.5, 0, -0.2],   [0.5, 0, -0.2],
    [-0.25, 0, 0.25],  [0.25, 0, 0.25]
  ];
  const rotations = [0, 0.15, -0.1, 0.08, -0.12];

  images.forEach((img, i) => {
    if (i >= positions.length) return;
    const [ox, , oz] = positions[i];
    const w = 0.55, h = 0.42;
    const mesh = makeImagePlane(img.src, w, h);
    mesh.rotation.x = -Math.PI / 2;
    mesh.rotation.z = rotations[i];
    mesh.position.set(2.5 + ox, -2.13, -1 + oz);
    mesh.userData = { zone: 'enlarger', imgIndex: i, label: PRODUCT_ZONES.enlarger.label };
    drScene.add(mesh);
    drMeshes.push(mesh);
  });

  // Loupe (cylinder + ring)
  const loupeMat = new THREE.MeshLambertMaterial({ color: 0x1a1a1a });
  const loupeBody = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.06, 16), loupeMat);
  loupeBody.position.set(2.5, -2.04, -1);
  drScene.add(loupeBody);
  const loupeRing = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.015, 8, 24), new THREE.MeshLambertMaterial({ color: 0x2a2a2a }));
  loupeRing.rotation.x = Math.PI / 2;
  loupeRing.position.set(2.5, -2.01, -1);
  drScene.add(loupeRing);
  // Handle
  const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.4, 8), loupeMat);
  handle.rotation.z = Math.PI / 4;
  handle.position.set(2.78, -2.04, -0.75);
  drScene.add(handle);
}

// LEFT WALL — cookware prints pinned at angle
function buildSideWall() {
  const images = PRODUCT_ZONES.wall.images;
  const cols = 3, rows = 3;
  const w = 0.85, h = 0.75;
  const gapX = 1.0, gapY = 0.92;
  const startY = ((rows - 1) * gapY) / 2 + 0.2;
  const wallZ = -(gapX * (cols - 1)) / 2;

  images.forEach((img, i) => {
    if (i >= cols * rows) return;
    const col = i % cols, row = Math.floor(i / cols);
    const y = startY - row * gapY;
    const z = wallZ + col * gapX;
    const mesh = makeImagePlane(img.src, w, h);
    mesh.rotation.y = Math.PI / 2;
    mesh.rotation.z = (Math.random() - 0.5) * 0.06;
    mesh.position.set(-6.8, y, z);
    mesh.userData = { zone: 'wall', imgIndex: i, label: PRODUCT_ZONES.wall.label };
    drScene.add(mesh);
    drMeshes.push(mesh);

    // Tape mark (small white rect top-center)
    const tapeMat = new THREE.MeshBasicMaterial({ color: 0x1a1a1a, transparent: true, opacity: 0.6 });
    const tape = new THREE.Mesh(new THREE.PlaneGeometry(0.18, 0.04), tapeMat);
    tape.rotation.y = Math.PI / 2;
    tape.position.set(-6.75, y + h / 2 + 0.03, z);
    drScene.add(tape);
  });
}

/* ── Image plane factory ────────────────────────────── */
function makeImagePlane(src, w, h) {
  const geo = new THREE.PlaneGeometry(w, h);

  // Dark placeholder — MeshLambertMaterial responds to safelight
  const mat = new THREE.MeshLambertMaterial({
    color: 0x1a0000,   // very dark red — safelight tints it naturally
    transparent: true,
    opacity: 0.6
  });
  const mesh = new THREE.Mesh(geo, mat);

  // Load texture async
  if (drTextureCache[src]) {
    applyTexture(mesh, drTextureCache[src], w, h);
  } else {
    const loader = new THREE.TextureLoader();
    loader.load(src,
      (tex) => {
        drTextureCache[src] = tex;
        applyTexture(mesh, tex, w, h);
      },
      undefined,
      () => {} // silent fail — darkroom stays dark if image missing
    );
  }

  return mesh;
}

function applyTexture(mesh, tex, w, h) {
  tex.minFilter = THREE.LinearFilter;
  tex.generateMipmaps = false;
  // MeshLambertMaterial — responds to scene lights including safelight
  mesh.material = new THREE.MeshLambertMaterial({
    map: tex,
    transparent: true,
    opacity: 0.0,
    color: 0xffffff   // white so texture shows true colours, safelight tints naturally
  });
  // Fade in — feels like developing in a tray
  const start = performance.now();
  function fadeIn() {
    const t = (performance.now() - start) / 1800;
    mesh.material.opacity = Math.min(t, 0.88);
    if (t < 1) requestAnimationFrame(fadeIn);
    else mesh.material.opacity = 0.88;
  }
  fadeIn();
}

/* ── Mouse interaction ──────────────────────────────── */
let drMouseX = 0, drMouseY = 0;

function onDrMouseMove(e) {
  if (!isDarkroomOpen) return;
  drMouseX = (e.clientX / window.innerWidth)  * 2 - 1;
  drMouseY = (e.clientY / window.innerHeight) * 2 - 1;

  // Camera parallax target
  drTargetCamX = drMouseX * 1.2;
  drTargetCamY = -drMouseY * 0.6;

  // Raycasting for hover
  drMouse.set(drMouseX, -drMouseY);
  drRaycaster.setFromCamera(drMouse, drCamera);
  const hits = drRaycaster.intersectObjects(drMeshes);

  if (hits.length > 0) {
    const hit = hits[0].object;
    if (drHovered !== hit) {
      if (drHovered) drHovered.material.color && (drHovered.material.emissive) && (drHovered.material.emissive.setHex(0x000000));
      drHovered = hit;
      drLabel.textContent = hit.userData.label || '';
      drLabel.style.opacity = '1';
      drCanvas.style.cursor = 'pointer';
    }
  } else {
    drHovered = null;
    drLabel.style.opacity = '0';
    drCanvas.style.cursor = 'default';
  }
}

function onDrClick(e) {
  if (!isDarkroomOpen || !drHovered) return;
  const { zone, imgIndex } = drHovered.userData;
  if (!zone) return;
  openDarkroomViewer(zone, imgIndex);
}

function onDrTouchMove(e) {
  if (!isDarkroomOpen) return;
  const t = e.touches[0];
  drMouseX = (t.clientX / window.innerWidth)  * 2 - 1;
  drMouseY = (t.clientY / window.innerHeight) * 2 - 1;
  drTargetCamX = drMouseX * 1.2;
  drTargetCamY = -drMouseY * 0.6;
}

/* ── Viewer (fullscreen image on click) ─────────────── */
function openDarkroomViewer(zone, imgIndex) {
  drViewerZone  = zone;
  drViewerIndex = imgIndex;
  const imgs = PRODUCT_ZONES[zone].images;
  drViewerImg.src = imgs[imgIndex].src;
  drViewerImg.alt = imgs[imgIndex].alt;
  drViewerMeta.textContent = `${PRODUCT_ZONES[zone].label} // ${imgIndex + 1} / ${imgs.length}`;
  drViewer.classList.add('active');
}

function closeDarkroomViewer() {
  drViewer.classList.remove('active');
}

document.getElementById('darkroom-viewer-prev').addEventListener('click', () => {
  if (!drViewerZone) return;
  const imgs = PRODUCT_ZONES[drViewerZone].images;
  drViewerIndex = (drViewerIndex - 1 + imgs.length) % imgs.length;
  openDarkroomViewer(drViewerZone, drViewerIndex);
});

document.getElementById('darkroom-viewer-next').addEventListener('click', () => {
  if (!drViewerZone) return;
  const imgs = PRODUCT_ZONES[drViewerZone].images;
  drViewerIndex = (drViewerIndex + 1) % imgs.length;
  openDarkroomViewer(drViewerZone, drViewerIndex);
});

/* ── Render loop ────────────────────────────────────── */
function darkroomRenderLoop() {
  if (!isDarkroomOpen) return;
  drAnimFrame = requestAnimationFrame(darkroomRenderLoop);

  // Smooth camera parallax
  drCamX += (drTargetCamX - drCamX) * 0.04;
  drCamY += (drTargetCamY - drCamY) * 0.04;
  drCamera.position.x = drCamX;
  drCamera.position.y = drCamY;
  drCamera.lookAt(drCamX * 0.3, drCamY * 0.3, 0);

  drRenderer.render(drScene, drCamera);
}

/* ── Toggle ─────────────────────────────────────────── */
function toggleProductGallery(open) {
  isDarkroomOpen = open;
  const productPage = document.getElementById('product-page');
  productPage.classList.toggle('active', open);
  document.body.style.overflow = open ? 'hidden' : 'auto';

  if (open) {
    // Init on first open
    initDarkroom();

    // Attach events
    drCanvas.addEventListener('mousemove', onDrMouseMove);
    drCanvas.addEventListener('click', onDrClick);
    drCanvas.addEventListener('touchmove', onDrTouchMove, { passive: true });

    // Hide hint after 4s
    drHint.style.opacity = '1';
    setTimeout(() => { drHint.style.opacity = '0'; }, 4000);

    // Start render loop
    darkroomRenderLoop();
  } else {
    // Stop render
    if (drAnimFrame) { cancelAnimationFrame(drAnimFrame); drAnimFrame = null; }
    drCanvas.removeEventListener('mousemove', onDrMouseMove);
    drCanvas.removeEventListener('click', onDrClick);
    drCanvas.removeEventListener('touchmove', onDrTouchMove);
    closeDarkroomViewer();
  }
}

function onDrResize() {
  if (!drRenderer) return;
  drCamera.aspect = window.innerWidth / window.innerHeight;
  drCamera.updateProjectionMatrix();
  drRenderer.setSize(window.innerWidth, window.innerHeight);
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
