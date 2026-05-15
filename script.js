/* ═══════════════════════════════════════════════════════
   DARKROOM GALLERY — David Langarica Style
   Full-screen cards, vertical scroll, bold typography
════════════════════════════════════════════════════════ */

const ZONES = {
  enlarger: {
    title: 'LENS',
    label: 'VISIONEXPRESS',
    images: [
      'images/product-visionexpress-frames-sunclip-flatlay-1.webp',
      'images/product-visionexpress-frames-lens-macro-detail-2.webp',
      'images/product-visionexpress-frames-front-face-studio-3.webp',
      'images/product-visionexpress-frames-temple-side-profile-4.webp',
      'images/product-visionexpress-frames-sunclip-3quarter-5.webp',
    ]
  },
  developing: {
    title: 'VESSEL',
    label: 'MACCLITE',
    images: [
      'images/product-macclite-wok-overhead-blue-studio-1.webp',
      'images/product-macclite-wok-angled-dramatic-studio-2.webp',
      'images/product-macclite-crepe-pan-side-profile-studio-3.webp',
      'images/product-macclite-tawa-frontal-studio-4.webp',
      'images/product-macclite-pan-handle-macro-detail-5.webp',
      'images/product-macclite-pan-kitchen-counter-lifestyle-6.webp',
    ]
  },
  wash: {
    title: 'WOVEN',
    label: 'NATURAL FIBRE',
    images: [
      'images/product-woven-basket-forest-editorial-bangalore-1.webp',
      'images/product-woven-basket-bougainvillea-lifestyle-bangalore-2.webp',
      'images/product-woven-tote-basket-dried-flowers-studio-3.webp',
      'images/product-woven-basket-overhead-citrus-4.webp',
      'images/product-woven-crossbody-bag-spotlight-studio-5.webp',
      'images/product-woven-open-basket-lifestyle-bangalore-6.webp',
    ]
  },
  wall: {
    title: 'SOLE',
    label: 'LP SNEAKERS',
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

const ZONE_ORDER = ['enlarger', 'developing', 'wash', 'wall'];

/* ─ Hardcopy Photo Shader ─ */
const HARDCOPY_SHADER = {
  uniforms: {
    uTexture: { value: null },
    uGrainAmount: { value: 0.12 },
    uPaperTint: { value: new THREE.Color(0xf5e8d8) },
    uEdgeWear: { value: 0.10 }
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D uTexture;
    uniform float uGrainAmount;
    uniform vec3 uPaperTint;
    uniform float uEdgeWear;
    varying vec2 vUv;
    
    float noise(vec2 p) {
      return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
    }
    
    void main() {
      vec4 color = texture2D(uTexture, vUv);
      float grain = noise(vUv * 800.0);
      color.rgb = mix(color.rgb, color.rgb * mix(0.95, 1.05, grain), uGrainAmount);
      color.rgb = mix(color.rgb, uPaperTint, 0.06);
      float edge = length(vUv - 0.5) * 1.4;
      color.rgb *= 1.0 - (edge * uEdgeWear);
      gl_FragColor = color;
    }
  `
};

/* ─ Global State ─ */
let isDarkroomOpen = false;
let currentZone = 0;
let viewerOpen = false;
let viewerZone = null;
let viewerIdx = 0;
let textureLoader;

/* ─ Initialize ─ */
function initDarkroom() {
  textureLoader = new THREE.TextureLoader();
  buildProductPage();
  setupScroll();
}

function buildProductPage() {
  const page = document.getElementById('product-page');
  page.innerHTML = '';

  ZONE_ORDER.forEach((zoneKey, idx) => {
    const zone = ZONES[zoneKey];
    const card = document.createElement('div');
    card.className = 'zone-card';
    card.dataset.zone = zoneKey;

    const content = document.createElement('div');
    content.className = 'zone-content';

    const text = document.createElement('div');
    text.className = 'zone-text';
    text.innerHTML = `
      <div class="category-label">${zone.label}</div>
      <h2>${zone.title}</h2>
    `;

    const visual = document.createElement('div');
    visual.className = 'zone-visual';

    const grid = document.createElement('div');
    grid.className = 'photos-grid';

    zone.images.forEach((src, i) => {
      const item = document.createElement('div');
      item.className = 'photo-item';
      item.onclick = () => openViewer(zoneKey, i);

      const img = document.createElement('img');
      img.loading = 'lazy';
      img.src = src;
      img.alt = `${zone.label} product ${i + 1}`;

      item.appendChild(img);
      grid.appendChild(item);
    });

    visual.appendChild(grid);
    content.appendChild(text);
    content.appendChild(visual);
    card.appendChild(content);
    page.appendChild(card);
  });
}

function setupScroll() {
  let ticking = false;
  const page = document.getElementById('product-page');

  window.addEventListener('wheel', (e) => {
    if (!isDarkroomOpen) return;
    if (ticking) return;
    ticking = true;

    const direction = e.deltaY > 0 ? 1 : -1;
    currentZone = Math.max(0, Math.min(ZONE_ORDER.length - 1, currentZone + direction));

    const target = document.querySelector(`[data-zone="${ZONE_ORDER[currentZone]}"]`);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    setTimeout(() => { ticking = false; }, 800);
  }, { passive: true });
}

function openViewer(zoneKey, idx) {
  viewerZone = zoneKey;
  viewerIdx = idx;
  viewerOpen = true;

  const zone = ZONES[zoneKey];
  const viewer = document.getElementById('darkroom-viewer');
  const img = document.getElementById('darkroom-viewer-img');
  const meta = document.getElementById('darkroom-viewer-meta');

  img.src = zone.images[idx];
  img.alt = `${zone.label} ${idx + 1}`;
  img.style.animation = 'none';
  img.offsetHeight;
  img.style.animation = 'viewer-open 0.8s cubic-bezier(0.22, 1, 0.36, 1) forwards';

  meta.textContent = `${zone.label.toUpperCase()} // ${idx + 1} / ${zone.images.length}`;
  viewer.classList.add('active');
}

function closeViewer() {
  document.getElementById('darkroom-viewer').classList.remove('active');
  viewerOpen = false;
}

document.getElementById('darkroom-viewer-prev').addEventListener('click', () => {
  if (!viewerZone) return;
  const n = ZONES[viewerZone].images.length;
  openViewer(viewerZone, (viewerIdx - 1 + n) % n);
});

document.getElementById('darkroom-viewer-next').addEventListener('click', () => {
  if (!viewerZone) return;
  const n = ZONES[viewerZone].images.length;
  openViewer(viewerZone, (viewerIdx + 1) % n);
});

document.getElementById('darkroom-viewer-close').addEventListener('click', closeViewer);

/* ─ Toggle Product Gallery ─ */
async function toggleProductGallery(open) {
  isDarkroomOpen = open;
  const page = document.getElementById('product-page');
  
  if (open) {
    page.classList.add('active');
    document.body.style.overflow = 'hidden';
    
    if (page.children.length === 0) {
      const loading = document.getElementById('dr-loading');
      if (loading) loading.classList.remove('hidden');
      
      buildProductPage();
      
      setTimeout(() => {
        if (loading) loading.classList.add('hidden');
        const hint = document.getElementById('darkroom-hint');
        if (hint) {
          hint.classList.add('visible');
          setTimeout(() => hint.classList.remove('visible'), 3500);
        }
      }, 500);
    }

    currentZone = 0;
    const firstCard = document.querySelector('[data-zone="enlarger"]');
    if (firstCard) firstCard.scrollIntoView({ behavior: 'smooth' });

  } else {
    page.classList.remove('active');
    document.body.style.overflow = 'auto';
    closeViewer();
  }
}
