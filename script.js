/* ═══════════════════════════════════════════════════════
   GLSL SHADER SYSTEM — GPU-based glitch + RGB split
   Replaces SVG feTurbulence with real WebGL shaders.
   Scroll velocity drives RGB split intensity.
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

  // Hash function for pseudo-random noise
  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }

  // Smooth noise
  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(hash(i), hash(i + vec2(1,0)), f.x),
      mix(hash(i + vec2(0,1)), hash(i + vec2(1,1)), f.x),
      f.y
    );
  }

  void main() {
    vec2 uv = vUv;
    float t = uTime * 0.4;
    float vel = uVelocity;
    float intensity = uIntensity;

    // Base displacement from noise
    float nx = noise(uv * 4.0 + vec2(t, 0.0));
    float ny = noise(uv * 4.0 + vec2(0.0, t * 1.3));
    vec2 displacement = vec2(nx - 0.5, ny - 0.5) * intensity * 0.012;

    // Scanline flicker — subtle horizontal bands
    float scanline = sin(uv.y * uResolution.y * 0.5 + t * 8.0) * 0.004 * intensity;
    displacement.x += scanline;

    // Block glitch — random horizontal slice displacement on fast scroll
    float blockY = floor(uv.y * 24.0) / 24.0;
    float blockRand = hash(vec2(blockY, floor(t * 6.0)));
    float blockStrength = step(0.85, blockRand) * vel * 0.04;
    displacement.x += blockStrength * (blockRand - 0.5) * 2.0;

    // RGB channel split — widens with scroll velocity
    float rgbSplit = (intensity * 0.008) + (vel * 0.025);

    vec2 uvR = uv + displacement + vec2( rgbSplit, 0.0);
    vec2 uvG = uv + displacement;
    vec2 uvB = uv + displacement + vec2(-rgbSplit, 0.0);

    // Clamp UVs to avoid edge bleeding
    uvR = clamp(uvR, 0.001, 0.999);
    uvG = clamp(uvG, 0.001, 0.999);
    uvB = clamp(uvB, 0.001, 0.999);

    float r = texture2D(uTexture, uvR).r;
    float g = texture2D(uTexture, uvG).g;
    float b = texture2D(uTexture, uvB).b;
    float a = texture2D(uTexture, uvG).a;

    gl_FragColor = vec4(r, g, b, a * intensity * 0.5);
  }
`;

// ── Three.js setup ──────────────────────────────────────
const glCanvas   = document.getElementById('glsl-canvas');
let glRenderer, glScene, glCamera, glMesh, glUniforms;
let glActive     = false;
let glVelocity   = 0;
let glIntensity  = 0;
let glTargetVel  = 0;
let glTargetInt  = 0;
let glAnimFrame  = null;
let glLastY      = window.pageYOffset;

function initGL() {
  if (!window.THREE) return;

  glRenderer = new THREE.WebGLRenderer({ canvas: glCanvas, alpha: true, antialias: false });
  glRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  glRenderer.setSize(window.innerWidth, window.innerHeight);

  glScene  = new THREE.Scene();
  glCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

  // Create a canvas texture from a solid colour — actual content comes from DOM screenshot effect
  const texCanvas = document.createElement('canvas');
  texCanvas.width  = 2;
  texCanvas.height = 2;
  const ctx = texCanvas.getContext('2d');
  ctx.fillStyle = '#111111';
  ctx.fillRect(0, 0, 2, 2);
  const texture = new THREE.CanvasTexture(texCanvas);

  glUniforms = {
    uTime:       { value: 0 },
    uVelocity:   { value: 0 },
    uIntensity:  { value: 0 },
    uTexture:    { value: texture },
    uResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
  };

  const mat  = new THREE.ShaderMaterial({
    vertexShader:   VERT_SHADER,
    fragmentShader: FRAG_SHADER,
    uniforms:       glUniforms,
    transparent:    true,
    blending:       THREE.NormalBlending,
  });

  glMesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat);
  glScene.add(glMesh);

  window.addEventListener('resize', () => {
    glRenderer.setSize(window.innerWidth, window.innerHeight);
    glUniforms.uResolution.value.set(window.innerWidth, window.innerHeight);
  });
}

function glRenderLoop(ts) {
  glAnimFrame = requestAnimationFrame(glRenderLoop);

  // Smooth velocity and intensity
  glVelocity  += (glTargetVel - glVelocity)  * 0.12;
  glIntensity += (glTargetInt - glIntensity) * 0.08;

  // Decay targets
  glTargetVel *= 0.88;
  glTargetInt *= 0.92;

  glUniforms.uTime.value      = ts * 0.001;
  glUniforms.uVelocity.value  = glVelocity;
  glUniforms.uIntensity.value = glIntensity;

  glRenderer.render(glScene, glCamera);
}

function triggerGLGlitch(velocity) {
  if (!glUniforms) return;
  // Velocity drives both RGB split and displacement
  glTargetVel = Math.min(velocity / 800, 1.0);
  glTargetInt = 0.4 + glTargetVel * 0.6;
}

// Start GL
initGL();
if (glRenderer) {
  glRenderLoop(0);
}

// Feed scroll velocity into shader
window.addEventListener('scroll', () => {
  const currentY = window.pageYOffset;
  const delta    = Math.abs(currentY - glLastY);
  glLastY        = currentY;
  if (delta > 2) triggerGLGlitch(delta * 8);
}, { passive: true });

/* ═══════════════════════════════════════════════════════
   PRODUCT IMAGES — vision-scored by Claude after viewing all 36 photos
   Scores are based on actual visual analysis, not guesswork.
   weight: 0-1 (visual impact), tone: dark/warm/cool/neutral/light
   region: where the visual weight lands (center/left/right/top)
   busy: 0-1 (compositional complexity)
   shape: dominant geometric form for easter egg animation
════════════════════════════════════════════════════════ */
const PRODUCT_IMAGES = [

  // ── WOVEN — natural fibre baskets & bags ──────────────
  {
    src: 'images/product-woven-basket-forest-editorial-bangalore-1.webp',
    alt: 'Woven basket editorial product photography in forest setting Bangalore',
    group: 'woven', label: 'WOVEN',
    weight: 0.95, tone: 'dark', region: 'center', busy: 0.4,
    shape: 'hexagon', hero: true
  },
  {
    src: 'images/product-woven-basket-bougainvillea-lifestyle-bangalore-2.webp',
    alt: 'Handwoven basket held against bougainvillea lifestyle photography Bangalore',
    group: 'woven', label: 'WOVEN',
    weight: 0.9, tone: 'warm', region: 'center', busy: 0.6,
    shape: 'hexagon', hero: true
  },
  {
    src: 'images/product-woven-tote-basket-dried-flowers-studio-3.webp',
    alt: 'Woven tote basket with dried flowers studio product photography',
    group: 'woven', label: 'WOVEN',
    weight: 0.9, tone: 'light', region: 'center', busy: 0.5,
    shape: 'hexagon', hero: true
  },
  {
    src: 'images/product-woven-basket-overhead-citrus-4.webp',
    alt: 'Woven basket overhead shot with citrus product photography',
    group: 'woven', label: 'WOVEN',
    weight: 0.75, tone: 'light', region: 'left', busy: 0.4,
    shape: 'hexagon', hero: false
  },
  {
    src: 'images/product-woven-crossbody-bag-spotlight-studio-5.webp',
    alt: 'Woven crossbody bag spotlight studio product photography Bangalore',
    group: 'woven', label: 'WOVEN',
    weight: 0.85, tone: 'dark', region: 'center', busy: 0.3,
    shape: 'hexagon', hero: false
  },
  {
    src: 'images/product-woven-open-basket-lifestyle-bangalore-6.webp',
    alt: 'Open weave basket lifestyle product photography Bangalore studio',
    group: 'woven', label: 'WOVEN',
    weight: 0.7, tone: 'neutral', region: 'center', busy: 0.5,
    shape: 'hexagon', hero: false
  },
  {
    src: 'images/product-natural-fibre-mat-table-setting-brass-7.webp',
    alt: 'Natural fibre table mat with brass thali marigolds diyas product photography',
    group: 'woven', label: 'WOVEN',
    weight: 0.95, tone: 'warm', region: 'center', busy: 0.7,
    shape: 'hexagon', hero: true
  },

  // ── DRAPE — Louis Philippe ties & accessories ─────────
  {
    src: 'images/product-louis-philippe-tie-box-flatlay-studio-1.webp',
    alt: 'Louis Philippe tie gift box flatlay product photography Bangalore studio',
    group: 'drape', label: 'DRAPE',
    weight: 0.95, tone: 'dark', region: 'center', busy: 0.7,
    shape: 'diamond', hero: true
  },
  {
    src: 'images/product-louis-philippe-tie-set-pedestal-studio-2.webp',
    alt: 'Louis Philippe tie cufflink set on white pedestal product photography',
    group: 'drape', label: 'DRAPE',
    weight: 0.85, tone: 'neutral', region: 'center', busy: 0.4,
    shape: 'diamond', hero: false
  },
  {
    src: 'images/product-louis-philippe-navy-tie-rolled-wire-grid-3.webp',
    alt: 'Louis Philippe navy rolled tie on wire grid product photography',
    group: 'drape', label: 'DRAPE',
    weight: 0.8, tone: 'cool', region: 'center', busy: 0.3,
    shape: 'diamond', hero: false
  },
  {
    src: 'images/product-louis-philippe-burgundy-tie-curved-paper-4.webp',
    alt: 'Louis Philippe burgundy tie with curved paper product photography',
    group: 'drape', label: 'DRAPE',
    weight: 0.9, tone: 'warm', region: 'right', busy: 0.3,
    shape: 'diamond', hero: true
  },
  {
    src: 'images/product-louis-philippe-belt-wallet-wood-5.webp',
    alt: 'Louis Philippe leather belt and wallet on wood surface product photography',
    group: 'drape', label: 'DRAPE',
    weight: 0.7, tone: 'warm', region: 'left', busy: 0.4,
    shape: 'diamond', hero: false
  },

  // ── SOLE — Louis Philippe sneakers ───────────────────
  {
    src: 'images/product-louis-philippe-sneaker-side-profile-studio-1.webp',
    alt: 'Louis Philippe sneaker side profile ecommerce product photography',
    group: 'sole', label: 'SOLE',
    weight: 0.9, tone: 'light', region: 'center', busy: 0.3,
    shape: 'sneaker', hero: true
  },
  {
    src: 'images/product-louis-philippe-sneaker-sole-detail-studio-2.webp',
    alt: 'Louis Philippe sneaker sole branding detail product photography',
    group: 'sole', label: 'SOLE',
    weight: 0.75, tone: 'warm', region: 'center', busy: 0.6,
    shape: 'sneaker', hero: false
  },
  {
    src: 'images/product-louis-philippe-sneaker-heel-suede-detail-3.webp',
    alt: 'Louis Philippe sneaker heel suede detail macro product photography',
    group: 'sole', label: 'SOLE',
    weight: 0.7, tone: 'warm', region: 'right', busy: 0.4,
    shape: 'sneaker', hero: false
  },
  {
    src: 'images/product-louis-philippe-sneaker-toe-logo-macro-4.webp',
    alt: 'Louis Philippe sneaker toe logo macro detail product photography',
    group: 'sole', label: 'SOLE',
    weight: 0.8, tone: 'light', region: 'left', busy: 0.5,
    shape: 'sneaker', hero: false
  },
  {
    src: 'images/product-louis-philippe-sneaker-sole-bottom-studio-5.webp',
    alt: 'Louis Philippe sneaker sole bottom view product photography studio',
    group: 'sole', label: 'SOLE',
    weight: 0.65, tone: 'warm', region: 'center', busy: 0.6,
    shape: 'sneaker', hero: false
  },
  {
    src: 'images/product-louis-philippe-sneaker-pair-front-angle-6.webp',
    alt: 'Louis Philippe sneaker pair front three quarter angle product photography',
    group: 'sole', label: 'SOLE',
    weight: 0.92, tone: 'light', region: 'center', busy: 0.4,
    shape: 'sneaker', hero: true
  },
  {
    src: 'images/product-louis-philippe-sneaker-pair-top-overhead-7.webp',
    alt: 'Louis Philippe sneaker pair top down overhead product photography',
    group: 'sole', label: 'SOLE',
    weight: 0.88, tone: 'light', region: 'center', busy: 0.5,
    shape: 'sneaker', hero: true
  },
  {
    src: 'images/product-louis-philippe-sneaker-pair-rear-angle-8.webp',
    alt: 'Louis Philippe sneaker pair rear three quarter angle product photography',
    group: 'sole', label: 'SOLE',
    weight: 0.85, tone: 'light', region: 'center', busy: 0.4,
    shape: 'sneaker', hero: false
  },

  // ── LENS — VisionExpress eyewear ─────────────────────
  {
    src: 'images/product-visionexpress-frames-sunclip-flatlay-1.webp',
    alt: 'VisionExpress optical frames with magnetic sunclip flatlay product photography',
    group: 'lens', label: 'LENS',
    weight: 0.85, tone: 'light', region: 'center', busy: 0.4,
    shape: 'circles', hero: false
  },
  {
    src: 'images/product-visionexpress-frames-lens-macro-detail-2.webp',
    alt: 'VisionExpress optical frame lens corner macro detail product photography',
    group: 'lens', label: 'LENS',
    weight: 0.9, tone: 'light', region: 'center', busy: 0.3,
    shape: 'circles', hero: true
  },
  {
    src: 'images/product-visionexpress-frames-front-face-studio-3.webp',
    alt: 'VisionExpress optical frames front face ecommerce product photography',
    group: 'lens', label: 'LENS',
    weight: 0.8, tone: 'light', region: 'center', busy: 0.3,
    shape: 'circles', hero: false
  },
  {
    src: 'images/product-visionexpress-frames-temple-side-profile-4.webp',
    alt: 'VisionExpress optical frames temple side profile product photography',
    group: 'lens', label: 'LENS',
    weight: 0.85, tone: 'light', region: 'right', busy: 0.2,
    shape: 'circles', hero: false
  },
  {
    src: 'images/product-visionexpress-frames-sunclip-3quarter-5.webp',
    alt: 'VisionExpress optical frames with sunclip 3 quarter angle product photography',
    group: 'lens', label: 'LENS',
    weight: 0.75, tone: 'light', region: 'center', busy: 0.4,
    shape: 'circles', hero: false
  },

  // ── VESSEL — MACclite cookware ────────────────────────
  {
    src: 'images/product-macclite-wok-overhead-blue-studio-1.webp',
    alt: 'MACclite blue wok overhead ecommerce product photography white background',
    group: 'vessel', label: 'VESSEL',
    weight: 0.95, tone: 'cool', region: 'center', busy: 0.2,
    shape: 'circle', hero: true
  },
  {
    src: 'images/product-macclite-wok-angled-dramatic-studio-2.webp',
    alt: 'MACclite wok angled dramatic studio product photography Bangalore',
    group: 'vessel', label: 'VESSEL',
    weight: 0.9, tone: 'dark', region: 'center', busy: 0.3,
    shape: 'circle', hero: true
  },
  {
    src: 'images/product-macclite-crepe-pan-side-profile-studio-3.webp',
    alt: 'MACclite crepe pan side profile ecommerce product photography',
    group: 'vessel', label: 'VESSEL',
    weight: 0.75, tone: 'neutral', region: 'center', busy: 0.2,
    shape: 'circle', hero: false
  },
  {
    src: 'images/product-macclite-tawa-frontal-studio-4.webp',
    alt: 'MACclite tawa frontal view ecommerce product photography white background',
    group: 'vessel', label: 'VESSEL',
    weight: 0.7, tone: 'dark', region: 'center', busy: 0.2,
    shape: 'circle', hero: false
  },
  {
    src: 'images/product-macclite-pan-handle-macro-detail-5.webp',
    alt: 'MACclite pan wooden handle macro detail product photography',
    group: 'vessel', label: 'VESSEL',
    weight: 0.8, tone: 'warm', region: 'right', busy: 0.3,
    shape: 'circle', hero: false
  },
  {
    src: 'images/product-macclite-pan-kitchen-counter-lifestyle-6.webp',
    alt: 'MACclite pan on kitchen counter lifestyle product photography Bangalore',
    group: 'vessel', label: 'VESSEL',
    weight: 0.75, tone: 'warm', region: 'center', busy: 0.6,
    shape: 'circle', hero: false
  },
  {
    src: 'images/product-macclite-tawa-overhead-burlap-lifestyle-7.webp',
    alt: 'MACclite tawa overhead burlap lifestyle product photography',
    group: 'vessel', label: 'VESSEL',
    weight: 0.9, tone: 'dark', region: 'center', busy: 0.5,
    shape: 'circle', hero: true
  },
  {
    src: 'images/product-macclite-wok-overhead-props-lifestyle-8.webp',
    alt: 'MACclite blue wok overhead with kitchen props lifestyle photography',
    group: 'vessel', label: 'VESSEL',
    weight: 0.9, tone: 'cool', region: 'center', busy: 0.6,
    shape: 'circle', hero: true
  },
  {
    src: 'images/product-macclite-pan-uttapam-food-styling-9.webp',
    alt: 'MACclite pan with uttapam food styling product photography Bangalore',
    group: 'vessel', label: 'VESSEL',
    weight: 0.95, tone: 'warm', region: 'left', busy: 0.7,
    shape: 'circle', hero: true
  },
];

/* ═══════════════════════════════════════════════════════
   FASHION GALLERY — original code, completely untouched
════════════════════════════════════════════════════════ */
const container     = document.getElementById('brush-container');
const master        = document.getElementById('master-site');
const albumScroll   = document.getElementById('album-scroll');
const transitionLayer = document.getElementById('asdf-transition-layer');
const portfolioPage = document.getElementById('portfolio-page');

let lastScrollY  = window.pageYOffset;
let lastScrollX  = 0;
let isAlbumOpen  = false;
let scrollTicking = false;
let albumTicking  = false;

function createMoshStamp(yPos) {
  if (isAlbumOpen) return;

  // Max 2 stamps at a time
  const existing = container.querySelectorAll('.brush-stamp');
  if (existing.length >= 2) existing[0].remove();

  const vh = window.innerHeight;
  const noMoshEls = document.querySelectorAll('[data-no-mosh]');
  let safeHeight = vh;

  noMoshEls.forEach(el => {
    const rect = el.getBoundingClientRect();
    if (rect.top < vh && rect.bottom > 0) {
      const edge = Math.max(0, rect.top);
      if (edge < safeHeight) safeHeight = edge;
    }
  });

  if (safeHeight <= 0) return;

  noMoshEls.forEach(el => el.style.visibility = 'hidden');

  const stamp = document.createElement('div');
  stamp.className = 'brush-stamp';
  stamp.appendChild(master.cloneNode(true));
  stamp.style.top = `-${yPos}px`;

  noMoshEls.forEach(el => el.style.visibility = '');

  if (safeHeight < vh) {
    stamp.style.clipPath = `inset(0 0 ${vh - safeHeight}px 0)`;
  }

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
    const lClip = i === 0         ? '0px' : '-1000px';
    const rClip = i === total - 1 ? '0px' : '-1000px';
    Object.assign(stamp.style, {
      width: `${rect.width}px`, height: `${rect.height}px`,
      left: `${rect.left}px`, top: `${rect.top}px`,
      clipPath: `inset(0px ${rClip} 0px ${lClip})`
    });
    stamp.appendChild(img.cloneNode());
    transitionLayer.appendChild(stamp);
    stamp.animate([
      { opacity: 1, transform: 'scaleX(1) translateX(0px)' },
      { opacity: 0, transform: 'scaleX(2.8) translateX(180px)' }
    ], { duration: 500, easing: 'cubic-bezier(0.33, 1, 0.68, 1)', fill: 'forwards' }).onfinish = () => stamp.remove();
  });
}

window.addEventListener('scroll', () => {
  if (scrollTicking) return;
  scrollTicking = true;
  requestAnimationFrame(() => {
    const currentY = window.pageYOffset;
    if (Math.abs(currentY - lastScrollY) > 35) { createMoshStamp(currentY); lastScrollY = currentY; }
    document.body.classList.toggle('scrolled', currentY > 50);
    scrollTicking = false;
  });
}, { passive: true });

albumScroll.addEventListener('scroll', () => {
  if (albumTicking) return;
  albumTicking = true;
  requestAnimationFrame(() => {
    if (Math.abs(albumScroll.scrollLeft - lastScrollX) > 15) { triggerAsdf(); lastScrollX = albumScroll.scrollLeft; }
    albumTicking = false;
  });
}, { passive: true });

albumScroll.addEventListener('wheel', (e) => {
  e.preventDefault();
  albumScroll.scrollLeft += e.deltaY;
}, { passive: false });

function togglePortfolio(open) {
  isAlbumOpen = open;
  portfolioPage.classList.toggle('active', open);
  document.body.style.overflow = open ? 'hidden' : 'auto';
}

/* ═══════════════════════════════════════════════════════
   PRODUCT GALLERY — AI COLLAGE SYSTEM
════════════════════════════════════════════════════════ */
const productPage        = document.getElementById('product-page');
const collageView        = document.getElementById('product-collage-view');
const collageStage       = document.getElementById('product-collage-stage');
const collageLoading     = document.getElementById('collage-loading');
const collageLoadingFill = document.getElementById('collage-loading-fill');
const collageLoadingText = document.getElementById('collage-loading-text');
const productScrollView  = document.getElementById('product-scroll-view');
const productAlbumScroll = document.getElementById('product-album-scroll');
const activeGroupTitle   = document.getElementById('active-group-title');

let productScrollX   = 0;
let productScrolling = false;
let isProductOpen    = false;

// Groups derived from image data
const GROUPS = [...new Set(PRODUCT_IMAGES.map(img => img.group))];

/* -- Score-driven layout algorithm — no API needed --
   Uses visual scores from actual image analysis.
   Different every load via seeded variation.
   Hero images get largest tiles, supporting images fill around them.
   Groups cluster by canvas region, with natural overlap.
════════════════════════════════════════════════════════ */

// Group canvas regions — intentional placement, not random
const GROUP_REGIONS = {
  woven:  { cx: 0.15, cy: 0.35 },  // left, mid-height — organic, grounded
  drape:  { cx: 0.42, cy: 0.20 },  // upper center — editorial, dominant
  sole:   { cx: 0.72, cy: 0.28 },  // upper right — precise, clean
  lens:   { cx: 0.60, cy: 0.68 },  // lower right — optical, detail
  vessel: { cx: 0.28, cy: 0.72 },  // lower left — circular, warm
};

// Lightweight seeded random — different each load, deterministic within session
function seededRandom(seed) {
  let s = seed;
  return function() {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function buildScoredLayout() {
  const vw  = window.innerWidth;
  const vh  = window.innerHeight;
  const seed = Date.now() % 9999;
  const rng  = seededRandom(seed);
  const layout = [];

  // Track group tile counts for badge placement
  const groupCount = {};

  PRODUCT_IMAGES.forEach((img, i) => {
    const region = GROUP_REGIONS[img.group] || { cx: 0.5, cy: 0.5 };

    // Base size driven by weight score
    const baseW = img.hero
      ? 180 + img.weight * 100          // heroes: 180–280px
      : 90  + img.weight * 80;          // supporting: 90–170px

    // Aspect ratio: portrait for woven/drape, landscape/square for vessel/sole
    const aspectRatio = ['woven', 'drape'].includes(img.group)
      ? 0.75 + rng() * 0.1              // portrait-ish
      : 0.85 + rng() * 0.2;            // squarer

    const w = Math.round(baseW);
    const h = Math.round(baseW / aspectRatio);

    // Cluster spread — heroes sit closer to center, supporting tiles spread out
    const spread = img.hero
      ? 40  + rng() * 40
      : 70  + rng() * 80;

    const angle  = rng() * Math.PI * 2;
    const cx     = region.cx * vw;
    const cy     = region.cy * vh;

    // Region bias — pull toward the dominant region of each image
    const regionBiasX = img.region === 'left'  ? -20 :
                        img.region === 'right' ?  20 : 0;

    let x = cx + Math.cos(angle) * spread + regionBiasX - w / 2;
    let y = cy + Math.sin(angle) * spread - h / 2;

    // Clamp within canvas with some bleed allowed
    x = Math.max(-w * 0.15, Math.min(vw - w * 0.85, x));
    y = Math.max(-h * 0.1,  Math.min(vh - h * 0.9,  y));

    // Z-index: heroes on top, weight drives stacking within group
    const z = img.hero
      ? 5 + Math.round(img.weight * 4)
      : 1 + Math.round(img.weight * 3);

    // Track for badge
    if (!groupCount[img.group]) groupCount[img.group] = 0;
    groupCount[img.group]++;

    layout.push({
      i, x: Math.round(x), y: Math.round(y),
      w, h, z,
      isFirstInGroup: groupCount[img.group] === 1
    });
  });

  return layout;
}

/* -- Fallback (kept for safety, now just calls score algorithm) -- */
function buildFallbackLayout() {
  return buildScoredLayout();
}

/* -- Render collage tiles from layout -- */
function renderCollage(layout) {
  collageStage.innerHTML = '';

  // Scale layout to actual viewport
  const scaleX = window.innerWidth  / 1000;
  const scaleY = window.innerHeight / 700;

  layout.forEach((tile, idx) => {
    const img = PRODUCT_IMAGES[tile.i];
    if (!img) return;

    const el = document.createElement('div');
    el.className = 'collage-tile';
    el.dataset.group = img.group;

    Object.assign(el.style, {
      left:   `${Math.round(tile.x * scaleX)}px`,
      top:    `${Math.round(tile.y * scaleY)}px`,
      width:  `${Math.round(tile.w * scaleX)}px`,
      height: `${Math.round(tile.h * scaleY)}px`,
      zIndex: tile.z,
      opacity: 0,
    });

    const imgEl = document.createElement('img');
    imgEl.src = img.src;
    imgEl.alt = img.alt;
    imgEl.loading = 'lazy';
    el.appendChild(imgEl);

    // Group badge on first tile of each group
    if (tile.isFirstInGroup) {
      const badge = document.createElement('div');
      badge.className = 'group-badge';
      badge.textContent = img.label;
      el.appendChild(badge);
    }

    // Click → zoom into group scroll
    el.addEventListener('click', () => openGroupScroll(img.group, img.label));

    collageStage.appendChild(el);

    // Staggered entrance
    setTimeout(() => {
      el.style.transition = 'opacity 0.4s ease, transform 0.4s cubic-bezier(0.19,1,0.22,1)';
      el.style.opacity = '1';
    }, 80 + idx * 30);
  });
}

async function toggleProductGallery(open) {
  isProductOpen = open;
  productPage.classList.toggle('active', open);
  document.body.style.overflow = open ? 'hidden' : 'auto';

  if (!open) {
    productScrollView.classList.remove('active');
    return;
  }

  // Reset
  productScrollView.classList.remove('active');
  collageStage.innerHTML = '';
  collageLoading.classList.remove('hidden');
  collageLoadingFill.style.width = '0%';
  collageLoadingText.textContent = 'COMPOSING';

  // Animate loading bar while layout builds
  let progress = 0;
  const progressInterval = setInterval(() => {
    progress = Math.min(progress + 25, 90);
    collageLoadingFill.style.width = `${progress}%`;
  }, 60);

  // Score-driven layout — instant, no API
  const layout = buildScoredLayout();

  clearInterval(progressInterval);
  collageLoadingFill.style.width = '100%';
  collageLoadingText.textContent = 'READY';

  setTimeout(() => {
    collageLoading.classList.add('hidden');
    renderCollage(layout);
  }, 300);
}

/* -- Open a group's horizontal scroll -- */
function openGroupScroll(groupKey, groupLabel) {
  const groupImages = PRODUCT_IMAGES.filter(img => img.group === groupKey);

  // Build scroll photos
  productAlbumScroll.innerHTML = '';
  groupImages.forEach(img => {
    const wrap = document.createElement('div');
    wrap.className = 'album-photo';
    const el = document.createElement('img');
    el.src = img.src;
    el.alt = img.alt;
    el.crossOrigin = 'anonymous';
    wrap.appendChild(el);
    productAlbumScroll.appendChild(wrap);
  });

  activeGroupTitle.textContent = `// ${groupLabel.toUpperCase()}_SERIES`;
  productScrollView.classList.add('active');
  productAlbumScroll.scrollLeft = 0;
  productScrollX = 0;
}

/* -- Back to collage overview -- */
function backToCollage() {
  productScrollView.classList.remove('active');
}

/* -- Wheel → horizontal scroll on product scroll -- */
productAlbumScroll.addEventListener('wheel', (e) => {
  e.preventDefault();
  productAlbumScroll.scrollLeft += e.deltaY;
}, { passive: false });

/* ═══════════════════════════════════════════════════════
   TIME-OF-DAY MOOD SYSTEM
   5 moods driven by visitor's local clock.
   Affects: hero overlay filter, page tint, gallery trigger image filters.
════════════════════════════════════════════════════════ */
const MOODS = {
  dawn: {
    // 5am–8am: cool blue, underexposed, barely waking
    label: 'DAWN_LIGHT',
    heroFilter:    'brightness(0.6) saturate(0.5) hue-rotate(200deg)',
    triggerFilter: 'grayscale(0.8) brightness(0.25) hue-rotate(180deg)',
    tint:          'rgba(30, 60, 120, 0.08)',
  },
  morning: {
    // 8am–12pm: warm gold, soft, gentle
    label: 'GOLDEN_HOUR',
    heroFilter:    'brightness(1.1) saturate(1.3) sepia(0.25)',
    triggerFilter: 'grayscale(0.4) brightness(0.35) sepia(0.3)',
    tint:          'rgba(255, 200, 80, 0.05)',
  },
  midday: {
    // 12pm–3pm: harsh white, bleached, overexposed
    label: 'MIDDAY_FLAT',
    heroFilter:    'brightness(1.3) saturate(0.7) contrast(1.2)',
    triggerFilter: 'grayscale(0.6) brightness(0.45) contrast(1.1)',
    tint:          'rgba(255, 255,240, 0.04)',
  },
  afternoon: {
    // 3pm–7pm: amber, rich, cinematic
    label: 'AMBER_HOUR',
    heroFilter:    'brightness(1.0) saturate(1.5) sepia(0.4) hue-rotate(-10deg)',
    triggerFilter: 'grayscale(0.2) brightness(0.4) sepia(0.4)',
    tint:          'rgba(200, 100, 20, 0.06)',
  },
  night: {
    // 7pm–5am: deep blue-black, desaturated, moody
    label: 'NIGHT_MODE',
    heroFilter:    'brightness(0.7) saturate(0.3) hue-rotate(220deg)',
    triggerFilter: 'grayscale(1) brightness(0.2) hue-rotate(200deg)',
    tint:          'rgba(10, 10, 40, 0.12)',
  },
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
  const mood  = getMood();
  const cfg   = MOODS[mood];

  // 1. Hero overlay filter
  const heroOverlay = document.getElementById('hero-overlay');
  if (heroOverlay) heroOverlay.style.filter = cfg.heroFilter;

  // 2. Gallery trigger images only
  const fashionImg = document.getElementById('fashion-trigger-img');
  const productImg = document.getElementById('product-trigger-img');
  if (fashionImg) fashionImg.style.filter = cfg.triggerFilter;
  if (productImg) productImg.style.filter = cfg.triggerFilter;

  // 3. Label in hero
  const moodLabel = document.getElementById('mood-label');
  if (moodLabel) moodLabel.textContent = cfg.label;

  // 4. Store on body for CSS hooks if needed
  document.body.dataset.mood = mood;
}

// Apply on load, then re-check every minute (in case page stays open across time boundary)
applyMood();
setInterval(applyMood, 60 * 1000);
