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

  // Hide no-mosh sections before cloning — restore immediately after (no flicker)
  const noMosh = document.querySelectorAll('[data-no-mosh]');
  noMosh.forEach(el => el.style.visibility = 'hidden');

  const stamp = document.createElement('div');
  stamp.className = 'brush-stamp';
  stamp.appendChild(master.cloneNode(true));
  stamp.style.top = `-${yPos}px`;
  container.appendChild(stamp);

  noMosh.forEach(el => el.style.visibility = '');

  stamp.animate([
    { opacity: 0.7, transform: 'translateY(0px) scale(1)' },
    { opacity: 0,   transform: 'translateY(25px) scale(1.01)' }
  ], { duration: 1000, easing: 'cubic-bezier(0.25, 1, 0.5, 1)' }).onfinish = () => stamp.remove();
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
    if (Math.abs(currentY - lastScrollY) > 12) { createMoshStamp(currentY); lastScrollY = currentY; }
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
