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


/* ══════════════════════════════════════
   PRODUCT GALLERY — INLINE + 3D BG
   Single tap. Durst enlarger in bg.
══════════════════════════════════════ */

let pgIsOpen = false;

function toggleProductGallery() {
  pgIsOpen = !pgIsOpen;
  const wrap  = document.getElementById('pg-grid-wrap');
  const label = document.getElementById('pg-trigger-label');

  wrap.classList.toggle('open', pgIsOpen);
  label.textContent = pgIsOpen ? 'PRODUCT_GALLERY ↑' : 'PRODUCT_GALLERY';

  if (pgIsOpen) {
    setTimeout(() => {
      document.getElementById('pg-grid-wrap').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 120);
    setTimeout(() => {
      document.querySelectorAll('.pg-item').forEach((el, i) => {
        setTimeout(() => el.classList.add('revealed'), i * 55);
      });
    }, 280);
    // Init 3D bg after grid is visible
    setTimeout(initEnlargerBg, 400);
  } else {
    document.getElementById('pg-trigger').scrollIntoView({ behavior: 'smooth', block: 'center' });
    document.querySelectorAll('.pg-item').forEach(el => el.classList.remove('revealed'));
    stopEnlargerBg();
  }
}

/* single tap — use touchend to avoid double-fire on mobile */
(function() {
  var trigger = document.getElementById('pg-trigger');
  if (!trigger) return;
  var tapped = false;
  trigger.addEventListener('touchend', function(e) {
    e.preventDefault();
    if (tapped) return;
    tapped = true;
    setTimeout(function(){ tapped = false; }, 400);
    toggleProductGallery();
  }, { passive: false });
})();

/* ── Lightbox — single tap, no double-click ── */
function pgOpen(el) {
  var img    = el.querySelector('img');
  var alt    = el.dataset.alt || img.alt || '';
  var lb     = document.getElementById('pg-lightbox');
  var lbImg  = document.getElementById('pg-lightbox-img');
  var lbMeta = document.getElementById('pg-lightbox-meta');
  lbImg.src  = img.src;
  lbImg.alt  = alt;
  lbMeta.textContent = alt.toUpperCase();
  lb.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function pgClose() {
  document.getElementById('pg-lightbox').classList.remove('active');
  document.body.style.overflow = '';
}

document.addEventListener('keydown', function(e) { if (e.key === 'Escape') pgClose(); });

/* stop lightbox-img click from bubbling to overlay */
document.addEventListener('DOMContentLoaded', function() {
  var lbImg = document.getElementById('pg-lightbox-img');
  if (lbImg) lbImg.addEventListener('click', function(e) { e.stopPropagation(); });
  /* also prevent close btn propagation */
  var closeBtn = document.getElementById('pg-lightbox-close');
  if (closeBtn) closeBtn.addEventListener('click', function(e) { e.stopPropagation(); pgClose(); });
});

/* ══ 3D ENLARGER BACKGROUND ══ */
let pgRenderer = null, pgScene = null, pgCamera = null;
let pgAnimFrame = null, pgEnlargerModel = null, pgBgInited = false, pgTime = 0;

function initEnlargerBg() {
  var canvas = document.getElementById('pg-bg-canvas');
  if (!canvas || pgBgInited) {
    if (pgAnimFrame === null && pgScene) enlargerRenderLoop();
    return;
  }

  if (typeof THREE === 'undefined') return;

  pgBgInited = true;

  var w = canvas.offsetWidth || window.innerWidth;
  var h = canvas.offsetHeight || 600;

  pgRenderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: false, alpha: true });
  pgRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  pgRenderer.setSize(w, h);
  pgRenderer.toneMapping = THREE.ACESFilmicToneMapping;
  pgRenderer.toneMappingExposure = 0.9;
  pgRenderer.outputEncoding = THREE.sRGBEncoding;

  pgScene = new THREE.Scene();

  pgCamera = new THREE.PerspectiveCamera(42, w / h, 0.1, 100);
  pgCamera.position.set(0, 0.3, 3.2);
  pgCamera.lookAt(0, 0, 0);

  /* Lighting — warm safelight */
  pgScene.add(new THREE.AmbientLight(0x1a0800, 3.0));
  var key = new THREE.PointLight(0xff4400, 12, 20, 1.8);
  key.position.set(2, 4, 3);
  pgScene.add(key);
  var fill = new THREE.PointLight(0xff2200, 4, 12, 2);
  fill.position.set(-3, 1, 1);
  pgScene.add(fill);
  var top = new THREE.DirectionalLight(0xffc880, 1.2);
  top.position.set(0, 6, 2);
  pgScene.add(top);

  /* Load enlarger */
  var loader = new THREE.GLTFLoader();
  loader.load('models/durst_enlarger_darkroom_asset.glb', function(gltf) {
    pgEnlargerModel = gltf.scene;
    pgEnlargerModel.traverse(function(n) {
      if (n.isMesh) {
        n.castShadow = false;
        n.receiveShadow = false;
        /* desaturate slightly, darken so it reads as bg */
        if (n.material) {
          var m = n.material;
          if (m.color) m.color.multiplyScalar(0.55);
          m.roughness  = 0.85;
          m.metalness  = Math.min((m.metalness || 0) * 0.6, 0.4);
        }
      }
    });

    /* Scale to fit nicely */
    var box  = new THREE.Box3().setFromObject(pgEnlargerModel);
    var size = new THREE.Vector3(); box.getSize(size);
    var ctr  = new THREE.Vector3(); box.getCenter(ctr);
    var sc   = 2.8 / Math.max(size.x, size.y, size.z);
    pgEnlargerModel.scale.setScalar(sc);
    pgEnlargerModel.position.set(-ctr.x * sc, -ctr.y * sc + 0.1, -ctr.z * sc);

    pgScene.add(pgEnlargerModel);

    /* Fade canvas in */
    canvas.classList.add('visible');
    enlargerRenderLoop();
  }, undefined, function() {
    /* silently skip if model missing */
  });
}

function stopEnlargerBg() {
  if (pgAnimFrame) { cancelAnimationFrame(pgAnimFrame); pgAnimFrame = null; }
  var canvas = document.getElementById('pg-bg-canvas');
  if (canvas) canvas.classList.remove('visible');
}

function enlargerRenderLoop() {
  pgAnimFrame = requestAnimationFrame(enlargerRenderLoop);
  pgTime += 0.008;

  if (pgEnlargerModel) {
    /* slow drift */
    pgEnlargerModel.rotation.y = Math.sin(pgTime * 0.18) * 0.18;
    pgEnlargerModel.position.y += (Math.sin(pgTime * 0.22) * 0.018 - pgEnlargerModel.position.y % 0.1) * 0.01;
  }

  if (pgCamera) {
    pgCamera.position.x = Math.sin(pgTime * 0.12) * 0.15;
    pgCamera.lookAt(0, 0, 0);
  }

  /* Resize if container changed */
  var canvas = document.getElementById('pg-bg-canvas');
  if (canvas && pgRenderer) {
    var w = canvas.offsetWidth;
    var h = canvas.offsetHeight;
    if (w > 0 && h > 0) {
      if (pgRenderer.domElement.width !== w || pgRenderer.domElement.height !== h) {
        pgRenderer.setSize(w, h);
        pgCamera.aspect = w / h;
        pgCamera.updateProjectionMatrix();
      }
    }
  }

  pgRenderer.render(pgScene, pgCamera);
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
