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

    gl_FragColor = vec4(r, g, b, a * intensity * 0.7);
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
  ctx.fillStyle = '#ffffff';
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
    blending:       THREE.AdditiveBlending,
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
   PRODUCT IMAGES — rename your files to match these names
   Groups: baskets | eyewear | footwear | kitchenware | packaging | lifestyle
════════════════════════════════════════════════════════ */
const PRODUCT_IMAGES = [
  // BASKETS (natural fibre)
  { src: 'images/product-natural-fibre-basket-studio-bangalore-1.webp', alt: 'Natural fibre basket product photography Bangalore studio', group: 'baskets', label: 'Natural Fibre' },
  { src: 'images/product-handwoven-basket-white-background-2.webp',     alt: 'Handwoven basket on white background product shoot', group: 'baskets', label: 'Natural Fibre' },
  { src: 'images/product-rattan-basket-ecommerce-bangalore-3.webp',     alt: 'Rattan basket ecommerce product photography', group: 'baskets', label: 'Natural Fibre' },
  { src: 'images/product-wicker-storage-basket-catalogue-4.webp',       alt: 'Wicker storage basket catalogue photography Bangalore', group: 'baskets', label: 'Natural Fibre' },
  { src: 'images/product-seagrass-basket-lifestyle-shoot-5.webp',       alt: 'Seagrass basket lifestyle product photography', group: 'baskets', label: 'Natural Fibre' },

  // EYEWEAR (sunglasses + specs)
  { src: 'images/product-sunglasses-studio-photography-bangalore-1.webp', alt: 'Sunglasses studio product photography Bangalore', group: 'eyewear', label: 'Eyewear' },
  { src: 'images/product-designer-sunglasses-white-background-2.webp',    alt: 'Designer sunglasses white background product shoot', group: 'eyewear', label: 'Eyewear' },
  { src: 'images/product-spectacles-ecommerce-photography-3.webp',        alt: 'Spectacles ecommerce product photography studio', group: 'eyewear', label: 'Eyewear' },
  { src: 'images/product-eyeglasses-catalogue-bangalore-4.webp',          alt: 'Eyeglasses catalogue photography Bangalore', group: 'eyewear', label: 'Eyewear' },
  { src: 'images/product-optical-frames-studio-shoot-5.webp',             alt: 'Optical frames studio product shoot Bangalore', group: 'eyewear', label: 'Eyewear' },
  { src: 'images/product-sunglasses-lifestyle-commercial-6.webp',         alt: 'Sunglasses lifestyle commercial photography', group: 'eyewear', label: 'Eyewear' },

  // FOOTWEAR
  { src: 'images/product-shoes-studio-photography-bangalore-1.webp', alt: 'Shoes studio product photography Bangalore', group: 'footwear', label: 'Footwear' },
  { src: 'images/product-sneakers-white-background-ecommerce-2.webp', alt: 'Sneakers white background ecommerce product shoot', group: 'footwear', label: 'Footwear' },
  { src: 'images/product-footwear-catalogue-bangalore-studio-3.webp', alt: 'Footwear catalogue photography Bangalore studio', group: 'footwear', label: 'Footwear' },
  { src: 'images/product-leather-shoes-commercial-shoot-4.webp',      alt: 'Leather shoes commercial product photography', group: 'footwear', label: 'Footwear' },
  { src: 'images/product-sandals-lifestyle-product-photo-5.webp',     alt: 'Sandals lifestyle product photography Bangalore', group: 'footwear', label: 'Footwear' },

  // KITCHENWARE
  { src: 'images/product-kitchenware-studio-photography-bangalore-1.webp', alt: 'Kitchenware studio product photography Bangalore', group: 'kitchenware', label: 'Kitchenware' },
  { src: 'images/product-cookware-white-background-shoot-2.webp',          alt: 'Cookware white background product photography', group: 'kitchenware', label: 'Kitchenware' },
  { src: 'images/product-kitchen-accessories-catalogue-3.webp',            alt: 'Kitchen accessories catalogue product shoot Bangalore', group: 'kitchenware', label: 'Kitchenware' },
  { src: 'images/product-ceramic-tableware-ecommerce-4.webp',              alt: 'Ceramic tableware ecommerce photography Bangalore', group: 'kitchenware', label: 'Kitchenware' },
  { src: 'images/product-steel-utensils-commercial-shoot-5.webp',          alt: 'Steel utensils commercial product photography', group: 'kitchenware', label: 'Kitchenware' },

  // PACKAGING
  { src: 'images/product-packaging-studio-photography-bangalore-1.webp', alt: 'Product packaging studio photography Bangalore', group: 'packaging', label: 'Packaging' },
  { src: 'images/product-box-packaging-white-background-2.webp',         alt: 'Box packaging white background product shoot', group: 'packaging', label: 'Packaging' },
  { src: 'images/product-brand-packaging-commercial-shoot-3.webp',       alt: 'Brand packaging commercial photography Bangalore', group: 'packaging', label: 'Packaging' },
  { src: 'images/product-label-packaging-ecommerce-photo-4.webp',        alt: 'Label packaging ecommerce product photography', group: 'packaging', label: 'Packaging' },
  { src: 'images/product-luxury-packaging-catalogue-5.webp',             alt: 'Luxury packaging catalogue photography Bangalore', group: 'packaging', label: 'Packaging' },

  // LIFESTYLE / MISC
  { src: 'images/product-lifestyle-commercial-photography-bangalore-1.webp', alt: 'Lifestyle commercial product photography Bangalore', group: 'lifestyle', label: 'Lifestyle' },
  { src: 'images/product-still-life-studio-shoot-bangalore-2.webp',          alt: 'Still life studio product shoot Bangalore', group: 'lifestyle', label: 'Lifestyle' },
  { src: 'images/product-brand-campaign-photography-3.webp',                 alt: 'Brand campaign product photography Bangalore', group: 'lifestyle', label: 'Lifestyle' },
  { src: 'images/product-ecommerce-catalogue-studio-4.webp',                 alt: 'Ecommerce catalogue studio photography Bangalore', group: 'lifestyle', label: 'Lifestyle' },
  { src: 'images/product-commercial-still-life-shoot-5.webp',                alt: 'Commercial still life product shoot Bangalore', group: 'lifestyle', label: 'Lifestyle' },
  { src: 'images/product-studio-flat-lay-photography-6.webp',                alt: 'Studio flat lay product photography Bangalore', group: 'lifestyle', label: 'Lifestyle' },
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
const GROUP_COLORS = {
  baskets:     'rgba(210,180,140,0.15)',
  eyewear:     'rgba(140,180,210,0.15)',
  footwear:    'rgba(180,140,210,0.15)',
  kitchenware: 'rgba(140,210,180,0.15)',
  packaging:   'rgba(210,210,140,0.15)',
  lifestyle:   'rgba(210,155,140,0.15)',
};

/* -- Ask Claude API to build a narrative collage layout -- */
async function fetchAILayout() {
  const imageDescriptions = PRODUCT_IMAGES.map((img, i) =>
    `${i}: ${img.group} - ${img.alt}`
  ).join('\n');

  const prompt = `You are a creative art director composing a product photography collage for a portfolio website.
The canvas is 1000x700 units. You have 32 product images across 6 groups: baskets, eyewear, footwear, kitchenware, packaging, lifestyle.

Rules:
- Group images of the same type close together (within ~150 units of each other)
- Each group cluster should be in a different region of the canvas
- Images can overlap (overlap 10-40px is fine and encouraged for visual richness)
- Vary sizes: some images large (180-260px wide), some medium (120-160px), some small (80-110px)
- NO rotation or tilt — all images must be perfectly upright
- Place groups to form a loose organic shape, not a rigid grid
- Make it feel like a photographer's mood board — dense, confident, editorial

Images:
${imageDescriptions}

Respond with ONLY a valid JSON array (no markdown, no explanation) of 32 objects:
[{"i":0,"x":120,"y":80,"w":200,"h":260,"z":1}, ...]
Where i=image index, x/y=top-left position, w=width, h=height, z=z-index (1-10).`;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      messages: [{ role: 'user', content: prompt }]
    })
  });

  const data = await response.json();
  const text = data.content.map(b => b.text || '').join('');
  const clean = text.replace(/```json|```/g, '').trim();
  return JSON.parse(clean);
}

/* -- Fallback layout if API fails -- */
function buildFallbackLayout() {
  const vw = Math.min(window.innerWidth, 1000);
  const vh = Math.min(window.innerHeight, 700);
  const layout = [];
  const groupPositions = {
    baskets:     { cx: vw * 0.15, cy: vh * 0.25 },
    eyewear:     { cx: vw * 0.45, cy: vh * 0.15 },
    footwear:    { cx: vw * 0.75, cy: vh * 0.25 },
    kitchenware: { cx: vw * 0.20, cy: vh * 0.70 },
    packaging:   { cx: vw * 0.55, cy: vh * 0.65 },
    lifestyle:   { cx: vw * 0.80, cy: vh * 0.70 },
  };
  const sizes = [
    { w: 220, h: 280 }, { w: 150, h: 190 }, { w: 130, h: 165 },
    { w: 180, h: 230 }, { w: 110, h: 140 }, { w: 160, h: 200 },
  ];
  let sizeIdx = 0;
  PRODUCT_IMAGES.forEach((img, i) => {
    const center = groupPositions[img.group];
    const spread = 80;
    const angle = (i % 5) * (Math.PI * 2 / 5);
    const dist = 30 + (i % 3) * 25;
    const sz = sizes[sizeIdx % sizes.length];
    sizeIdx++;
    layout.push({
      i,
      x: Math.round(center.cx + Math.cos(angle) * dist - sz.w / 2),
      y: Math.round(center.cy + Math.sin(angle) * dist - sz.h / 2),
      w: sz.w, h: sz.h,
      z: 1 + (i % 5)
    });
  });
  return layout;
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
    const groupImages = layout.filter(t => PRODUCT_IMAGES[t.i]?.group === img.group);
    if (groupImages[0]?.i === tile.i) {
      const badge = document.createElement('div');
      badge.className = 'group-badge';
      badge.textContent = img.label.toUpperCase();
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

/* -- Open product gallery & trigger AI layout -- */
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
  collageLoadingText.textContent = 'AI_COMPOSING';

  // Fake progress bar
  let progress = 0;
  const progressInterval = setInterval(() => {
    progress = Math.min(progress + Math.random() * 15, 85);
    collageLoadingFill.style.width = `${progress}%`;
  }, 200);

  try {
    const layout = await fetchAILayout();
    clearInterval(progressInterval);
    collageLoadingFill.style.width = '100%';
    collageLoadingText.textContent = 'LAYOUT_READY';
    setTimeout(() => {
      collageLoading.classList.add('hidden');
      renderCollage(layout);
    }, 400);
  } catch (err) {
    // Fallback if API fails
    clearInterval(progressInterval);
    collageLoadingFill.style.width = '100%';
    collageLoadingText.textContent = 'COMPOSING';
    setTimeout(() => {
      collageLoading.classList.add('hidden');
      renderCollage(buildFallbackLayout());
    }, 400);
  }
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
