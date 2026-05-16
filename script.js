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
   PRODUCT GALLERY — FULL PAGE OVERLAY
   Same pattern as fashion gallery.
   Durst enlarger as 3D background.
══════════════════════════════════════ */

var productPage   = document.getElementById('product-page');
var productScroll = document.getElementById('product-scroll');

/* Wheel → horizontal scroll (same as fashion gallery) */
if (productScroll) {
  productScroll.addEventListener('wheel', function(e) {
    e.preventDefault();
    productScroll.scrollLeft += e.deltaY;
  }, { passive: false });
}

/* ── Toggle ── */
function toggleProductGallery(open) {
  productPage.classList.toggle('active', open);
  document.body.style.overflow = open ? 'hidden' : 'auto';
  if (open) {
    productScroll.scrollLeft = 0;
    initEnlargerBg();
  } else {
    stopEnlargerBg();
  }
}

/* ══ DURST ENLARGER 3D BACKGROUND ══
   Metal finish · Reddish-purple ambient
   Pulled back to show full model
   Datamosh noise plane behind it
════════════════════════════════════ */
var pgRenderer = null, pgScene = null, pgCamera = null;
var pgAnimFrame = null, pgEnlargerModel = null;
var pgBgInited  = false, pgTime = 0;
var pgNoiseMesh = null, pgNoiseUniforms = null;

/* Datamosh noise fragment shader — runs on a fullscreen quad behind model */
var PG_NOISE_VERT = `
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = vec4(position, 1.0); }
`;
var PG_NOISE_FRAG = `
  uniform float uTime;
  uniform vec2  uRes;
  varying vec2  vUv;

  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p); vec2 f = fract(p);
    f = f*f*(3.0-2.0*f);
    return mix(
      mix(hash(i), hash(i+vec2(1,0)), f.x),
      mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), f.x), f.y);
  }
  float fbm(vec2 p) {
    float v=0.; float a=0.5;
    for(int i=0;i<5;i++){ v+=a*noise(p); p*=2.1; a*=0.5; }
    return v;
  }

  void main() {
    vec2 uv = vUv;
    float t  = uTime * 0.18;

    /* Block displacement — datamosh style */
    float blockY    = floor(uv.y * 32.0) / 32.0;
    float blockRand = hash(vec2(blockY, floor(t * 4.0)));
    float blockShift = step(0.82, blockRand) * (blockRand - 0.5) * 0.06;
    uv.x += blockShift;

    /* Gradient base — dark purple top to carrot red bottom */
    vec3 grad = mix(
      vec3(0.12, 0.0,  0.28),   /* dark purple   — top    */
      vec3(0.85, 0.28, 0.02),   /* carrot red    — bottom */
      vUv.y
    );

    /* Noise modulation — subtle, don't kill the gradient */
    float n1 = fbm(uv * 3.5 + vec2(t * 0.6, t * 0.4));
    float n2 = fbm(uv * 6.0 - vec2(t * 0.3, t * 0.7));
    float n  = n1 * 0.7 + n2 * 0.3;

    /* Scanlines */
    float scan = sin(vUv.y * uRes.y * 0.8 + t * 12.0) * 0.012;

    vec3 col  = grad;
    /* Noise shifts colour slightly — keeps it alive */
    col.r += n * 0.12;
    col.b += (1.0 - n) * 0.08;
    col   += scan * vec3(0.3, 0.05, 0.1);

    /* Vignette */
    vec2  vig = vUv * (1.0 - vUv.yx);
    float v   = pow(vig.x * vig.y * 18.0, 0.55);
    col      *= mix(0.0, 1.0, v);

    /* Grain */
    float grain = hash(vUv * uRes + t * 137.0) * 0.035;
    col += grain * vec3(0.5, 0.15, 0.3);

    gl_FragColor = vec4(col, 0.82);
  }
`;

function initEnlargerBg() {
  var canvas = document.getElementById('pg-bg-canvas');
  if (!canvas) return;

  if (pgBgInited) {
    if (!pgAnimFrame) enlargerLoop();
    return;
  }
  if (typeof THREE === 'undefined') return;

  pgBgInited = true;

  pgRenderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
  pgRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  pgRenderer.setSize(window.innerWidth, window.innerHeight);
  pgRenderer.toneMapping = THREE.ACESFilmicToneMapping;
  pgRenderer.toneMappingExposure = 1.1;
  pgRenderer.outputEncoding = THREE.sRGBEncoding;
  pgRenderer.shadowMap.enabled = false;

  pgScene  = new THREE.Scene();

  /* Camera pulled well back — full model visible */
  pgCamera = new THREE.PerspectiveCamera(38, window.innerWidth / window.innerHeight, 0.1, 200);
  pgCamera.position.set(0, 0.5, 7.0);
  pgCamera.lookAt(0, 0, 0);

  /* ── Fullscreen datamosh noise quad (drawn at z = -5, behind model) ── */
  pgNoiseUniforms = {
    uTime: { value: 0.0 },
    uRes:  { value: new THREE.Vector2(window.innerWidth, window.innerHeight) }
  };
  var noiseMat  = new THREE.ShaderMaterial({
    uniforms:       pgNoiseUniforms,
    vertexShader:   PG_NOISE_VERT,
    fragmentShader: PG_NOISE_FRAG,
    depthWrite:     false,
    depthTest:      false,
  });
  /* Large plane that always covers the camera view at z = -40 */
  pgNoiseMesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), noiseMat);
  pgNoiseMesh.frustumCulled = false;
  /* Render before everything else */
  pgNoiseMesh.renderOrder = -1;
  /* Position it far back */
  pgNoiseMesh.position.z = -40;
  pgNoiseMesh.scale.set(80, 80, 1);
  pgScene.add(pgNoiseMesh);

  /* ── Lighting — reddish-purple davidlangarica mood ── */

  /* Ambient: deep reddish-purple */
  pgScene.add(new THREE.AmbientLight(0x3a0025, 6.0));

  /* Key: vivid magenta-red from upper right */
  var key = new THREE.PointLight(0xff0055, 35, 40, 1.6);
  key.position.set(4, 6, 5);
  pgScene.add(key);

  /* Fill: cool deep violet from left */
  var fill = new THREE.PointLight(0x5500aa, 18, 30, 1.8);
  fill.position.set(-5, 2, 3);
  pgScene.add(fill);

  /* Rim: hot pink from behind */
  var rim = new THREE.PointLight(0xff0088, 20, 25, 2.0);
  rim.position.set(0, -2, -4);
  pgScene.add(rim);

  /* Top: crimson direct */
  var top = new THREE.DirectionalLight(0xcc0044, 2.0);
  top.position.set(1, 8, 4);
  pgScene.add(top);

  /* Load model */
  var loader = new THREE.GLTFLoader();
  loader.load('models/durst_enlarger_darkroom_asset.glb', function(gltf) {
    pgEnlargerModel = gltf.scene;

    /* ── CHROME FINISH — pure mirror chrome ── */
    pgEnlargerModel.traverse(function(n) {
      if (!n.isMesh) return;
      n.material = new THREE.MeshStandardMaterial({
        color:           new THREE.Color(0xd0c8d8), /* cool silver-white */
        metalness:       1.0,
        roughness:       0.04,  /* near-mirror */
        envMapIntensity: 2.0,
      });
      n.castShadow    = false;
      n.receiveShadow = false;
    });

    /* Scale + center — 69% of previous 3.5 = 2.415 */
    var box = new THREE.Box3().setFromObject(pgEnlargerModel);
    var sz  = new THREE.Vector3(); box.getSize(sz);
    var ctr = new THREE.Vector3(); box.getCenter(ctr);
    var sc  = 2.415 / Math.max(sz.x, sz.y, sz.z);
    pgEnlargerModel.scale.setScalar(sc);
    pgEnlargerModel.position.set(-ctr.x * sc, -ctr.y * sc, -ctr.z * sc);

    pgScene.add(pgEnlargerModel);

    /* For r128: use a simple grey env cube so metal reflects something */
    var cubeRT = new THREE.WebGLCubeRenderTarget(128, {
      format: THREE.RGBFormat,
      generateMipmaps: true,
      minFilter: THREE.LinearMipmapLinearFilter
    });
    var cubeCamera = new THREE.CubeCamera(0.1, 100, cubeRT);
    pgScene.add(cubeCamera);
    cubeCamera.update(pgRenderer, pgScene);
    pgScene.environment = cubeRT.texture;
    pgEnlargerModel.traverse(function(n) {
      if (n.isMesh && n.material) n.material.envMap = cubeRT.texture;
    });

    canvas.classList.add('visible');
    enlargerLoop();
  }, undefined, function() { /* silent fail */ });
}

function stopEnlargerBg() {
  if (pgAnimFrame) { cancelAnimationFrame(pgAnimFrame); pgAnimFrame = null; }
  var canvas = document.getElementById('pg-bg-canvas');
  if (canvas) canvas.classList.remove('visible');
}

function enlargerLoop() {
  pgAnimFrame = requestAnimationFrame(enlargerLoop);
  pgTime += 0.008;

  /* Noise uniforms */
  if (pgNoiseUniforms) pgNoiseUniforms.uTime.value = pgTime;

  /* Model: slow Y rotation + subtle breathe */
  if (pgEnlargerModel) {
    pgEnlargerModel.rotation.y = Math.sin(pgTime * 0.12) * 0.20;
    pgEnlargerModel.rotation.x = Math.sin(pgTime * 0.07) * 0.03;
  }

  /* Camera: gentle drift */
  if (pgCamera) {
    pgCamera.position.x = Math.sin(pgTime * 0.09) * 0.25;
    pgCamera.position.y = 0.5 + Math.sin(pgTime * 0.06) * 0.15;
    pgCamera.lookAt(0, 0, 0);
  }

  if (pgRenderer && pgScene && pgCamera) {
    pgRenderer.render(pgScene, pgCamera);
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
