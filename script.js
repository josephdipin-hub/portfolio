/* ═══════════════════════════════════════════════════════
   GLSL SHADER SYSTEM
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
    gl_FragColor = vec4(r, g, b, a * intensity * 0.2);
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
   FASHION GALLERY
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
   PRODUCT GALLERY
══════════════════════════════════════ */
var productPage   = document.getElementById('product-page');
var productScroll = document.getElementById('product-scroll');

if (productScroll) {
  productScroll.addEventListener('wheel', function(e) {
    e.preventDefault();
    productScroll.scrollLeft += e.deltaY;
  }, { passive: false });
}

var pgScrollRotTarget = 0;
productScroll.addEventListener('scroll', function() {
  var fraction = productScroll.scrollLeft /
    (productScroll.scrollWidth - productScroll.clientWidth || 1);
  pgScrollRotTarget = fraction * Math.PI * 2;
  pgIsScrolling = true;
  clearTimeout(pgScrollTimer);
  pgScrollTimer = setTimeout(function() { pgIsScrolling = false; }, 150);
});

function toggleProductGallery(open) {
  productPage.classList.toggle('active', open);
  document.body.style.overflow = open ? 'hidden' : 'auto';
  if (open) {
    productScroll.scrollLeft = 0;
    initEnlargerBg();
    setTimeout(function() {
      document.getElementById('product-scroll').classList.add('ready');
    }, 800);
  } else {
    document.getElementById('product-scroll').classList.remove('ready');
    stopEnlargerBg();
  }
}

/* ══ DURST ENLARGER 3D BACKGROUND ══ */
var pgRenderer     = null, pgScene  = null, pgCamera = null;
var pgNoiseScene   = null, pgNoiseCamera = null;
var pgAnimFrame    = null, pgEnlargerModel = null;
var pgWatchModel   = null;
var pgBgInited     = false, pgTime = 0, pgLastTime = null;
var pgNoiseMesh    = null, pgNoiseUniforms = null;
var pgScrollRot    = 0;
var pgIsScrolling  = false, pgScrollTimer = null;
var pgCornerParticles = [];
var _pgCornerTex   = null;

/* ── Corner texture ── */
function _buildCornerTex() {
  var size = 64;
  var c = document.createElement('canvas');
  c.width = c.height = size;
  var ctx = c.getContext('2d');
  var g = ctx.createRadialGradient(size/2, size/2, 0, size/2, size/2, size/2);
  g.addColorStop(0.0, 'rgba(255, 180, 255, 1.0)');
  g.addColorStop(0.4, 'rgba(200, 100, 255, 0.6)');
  g.addColorStop(1.0, 'rgba(100,  50, 200, 0.0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  return new THREE.CanvasTexture(c);
}

/* ── Datamosh noise shaders ── */
/*
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
    float t = uTime * 0.18;

    float blockY    = floor(uv.y * 32.0) / 32.0;
    float blockRand = hash(vec2(blockY, floor(t * 4.0)));
    float blockShift = step(0.82, blockRand) * (blockRand - 0.5) * 0.06;
    uv.x += blockShift;

    vec3 grad = mix(
      vec3(0.38, 0.09, 0.01),
      vec3(0.05, 0.0,  0.14),
      vUv.y
    );

    float n1 = fbm(uv * 3.5 + vec2(t * 0.6, t * 0.4));
    float n2 = fbm(uv * 6.0 - vec2(t * 0.3, t * 0.7));
    float n  = n1 * 0.7 + n2 * 0.3;

    float scan = sin(vUv.y * uRes.y * 0.8 + t * 12.0) * 0.012;

    vec3 col = grad;
    col.r += n * 0.12;
    col.b += (1.0 - n) * 0.08;
    col   += scan * vec3(0.3, 0.05, 0.1);

    float grain = hash(vUv * uRes + t * 137.0) * 0.06;
    col += grain * vec3(0.5, 0.15, 0.3);

    gl_FragColor = vec4(col, 0.82);
  }
`;

function initEnlargerBg() {
  var canvas = document.getElementById('pg-bg-canvas');
  if (!canvas) return;
  if (pgBgInited) { if (!pgAnimFrame) enlargerLoop(); return; }
  if (typeof THREE === 'undefined') return;

  pgBgInited = true;
  _pgCornerTex = _buildCornerTex();

  pgRenderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
  pgRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  pgRenderer.setClearColor(0x000000, 0);
  pgRenderer.setSize(window.innerWidth, window.innerHeight);
  pgRenderer.toneMapping = THREE.ACESFilmicToneMapping;
  pgRenderer.toneMappingExposure = 1.1;
  pgRenderer.outputEncoding = THREE.sRGBEncoding;
  pgRenderer.shadowMap.enabled = false;

  pgScene = new THREE.Scene();
   */

  /* ── Camera ── */
  pgCamera = new THREE.PerspectiveCamera(38, window.innerWidth / window.innerHeight, 0.1, 200);
  pgCamera.position.set(0, 0.5, 7.0);
  pgCamera.lookAt(0, 0, 0);

  /* ── Noise scene ── */
  pgNoiseUniforms = {
    uTime: { value: 0.0 },
    uRes:  { value: new THREE.Vector2(window.innerWidth, window.innerHeight) }
  };
  var noiseMat = new THREE.ShaderMaterial({
    uniforms:       pgNoiseUniforms,
    vertexShader:   PG_NOISE_VERT,
    fragmentShader: PG_NOISE_FRAG,
    depthWrite:     false,
    depthTest:      false,
    transparent:    true,
  });
  pgNoiseMesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), noiseMat);
  pgNoiseMesh.frustumCulled = false;
  pgNoiseScene  = new THREE.Scene();
  pgNoiseCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  pgNoiseScene.add(pgNoiseMesh);

  /* ── Lighting ── */
  pgScene.add(new THREE.HemisphereLight(0x2a0010, 0x080015, 0.2));

  var backLight = new THREE.PointLight(0xff2255, 28, 15, 0.1);
  backLight.position.set(-4, 2, -3);
  pgScene.add(backLight);

  var fill = new THREE.PointLight(0xff1144, 5, 60, 0.1);
  fill.position.set(6, 6, 5);
  pgScene.add(fill);

  var rim = new THREE.PointLight(0x880033, 6, 20, 2.8);
  rim.position.set(3, 5, -5);
  pgScene.add(rim);

  /* ── Load enlarger ── */
  var loader = new THREE.GLTFLoader();
  loader.load('models/durst_enlarger_darkroom_asset.glb', function(gltf) {
    pgEnlargerModel = gltf.scene;

    pgEnlargerModel.traverse(function(n) {
      if (!n.isMesh) return;
      n.material = new THREE.MeshPhysicalMaterial({
        color:           new THREE.Color(0xffffff),
        metalness:       0.3,
        roughness:       0.0,
        transmission:    1.0,
        thickness:       3.5,
        ior:             2.5,
        transparent:     true,
        opacity:         1.0,
        envMapIntensity: 2.5,
      });
      n.castShadow    = true;
      n.receiveShadow = true;
    });

    /* Scale and center */
    var box = new THREE.Box3().setFromObject(pgEnlargerModel);
    var sz  = new THREE.Vector3(); box.getSize(sz);
    var ctr = new THREE.Vector3(); box.getCenter(ctr);
    var sc  = 2.9 / Math.max(sz.x, sz.y, sz.z);
    pgEnlargerModel.scale.setScalar(sc);
    pgEnlargerModel.position.set(-ctr.x * sc, -ctr.y * sc, -ctr.z * sc);

    pgScene.add(pgEnlargerModel);

    /* Env map */
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

    buildFogSystem(sc);

    /* ── Load watch ── */
    var loader2 = new THREE.GLTFLoader();
    loader2.load('models/stopwatch-284.glb', function(gltf2) {
      pgWatchModel = gltf2.scene;

      pgWatchModel.traverse(function(n) {
       if (!n.isMesh) return;
       n.material = new THREE.MeshStandardMaterial({
       color:           new THREE.Color(0xd0c8d8),
       metalness:       1.0,
       roughness:       0.04,
       envMapIntensity: 2.0,
      });
      n.castShadow    = false;
      n.receiveShadow = false;
      n.renderOrder   = 1;
     });

      var box2 = new THREE.Box3().setFromObject(pgWatchModel);
      var sz2  = new THREE.Vector3(); box2.getSize(sz2);
      var ctr2 = new THREE.Vector3(); box2.getCenter(ctr2);
      var sc2  = 2.0 / Math.max(sz2.x, sz2.y, sz2.z);
      pgWatchModel.scale.setScalar(sc2);
      pgWatchModel.position.set(-ctr2.x * sc2, -ctr2.y * sc2, -ctr2.z * sc2);

      pgWatchModel.traverse(function(n) {
        if (n.isMesh && n.material) n.material.envMap = cubeRT.texture;
      });

      pgWatchModel.position.y = 6.0;
      pgScene.add(pgWatchModel);
    }, undefined, function() {});

    canvas.classList.add('visible');
    document.getElementById('product-scroll').classList.add('ready');
    enlargerLoop();
  }, undefined, function() {});
}

/* ── FOG PARTICLE SYSTEM ── */
var pgFogParticles = [];
var FOG_PARTICLE_COUNT = 180;

function buildFogSystem(modelScale) {
  var fogY = -2.5;
  var size = 128;
  var fogCanvas = document.createElement('canvas');
  fogCanvas.width = fogCanvas.height = size;
  var ctx = fogCanvas.getContext('2d');
  var grad = ctx.createRadialGradient(size/2, size/2, 0, size/2, size/2, size/2);
  grad.addColorStop(0.0,  'rgba(255, 255, 255, 0.9)');
  grad.addColorStop(0.35, 'rgba(220, 210, 230, 0.5)');
  grad.addColorStop(0.7,  'rgba(180, 170, 200, 0.15)');
  grad.addColorStop(1.0,  'rgba(150, 140, 180, 0.0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  var fogTex = new THREE.CanvasTexture(fogCanvas);

  var mat = new THREE.SpriteMaterial({
    map:         fogTex,
    transparent: true,
    depthWrite:  false,
    blending:    THREE.NormalBlending,
    opacity:     1.0,
  });

  for (var i = 0; i < FOG_PARTICLE_COUNT; i++) {
    var sprite = new THREE.Sprite(mat.clone());
    var angle  = Math.random() * Math.PI * 2;
    var radius = Math.random() * 1.8;
    sprite.renderOrder = -1;
    sprite.position.set(
      Math.cos(angle) * radius * 1.4,
      fogY + Math.random() * 0.5,
      Math.sin(angle) * radius
    );
    var s = 0.4 + Math.random() * 0.6;
    sprite.scale.set(s, s, 1);
    sprite.userData = {
      baseY:    sprite.position.y,
      angle:    angle,
      radius:   radius,
      drift:    (Math.random() - 0.5) * 0.008,
      riseRate: 0.0004 + Math.random() * 0.0006,
      opacity:  0.04 + Math.random() * 0.06,
      phase:    Math.random() * Math.PI * 2,
    };
    sprite.material.opacity = sprite.userData.opacity;
    pgFogParticles.push(sprite);
    pgScene.add(sprite);
  }
}

function updateFogParticles() {
  var t = pgTime;
  pgFogParticles.forEach(function(s) {
    var d = s.userData;
    d.angle += d.drift;
    s.position.x = Math.cos(d.angle) * d.radius * 1.4;
    s.position.z = Math.sin(d.angle) * d.radius;
    s.position.y += d.riseRate;
    if (s.position.y > d.baseY + 0.9) s.position.y = d.baseY;
    s.material.opacity = d.opacity * (0.7 + 0.3 * Math.sin(t * 0.4 + d.phase));
  });
}

/* ── CORNER PARTICLE EMITTER ── */
function spawnCornerParticles() {
  if (!pgEnlargerModel) return;
  for (var i = 0; i < 4; i++) {
    var sprite = new THREE.Sprite(new THREE.SpriteMaterial({
      map:         _pgCornerTex,
      transparent: true,
      depthWrite:  false,
      blending:    THREE.AdditiveBlending,
      opacity:     0.8,
    }));
    var s = 0.05 + Math.random() * 0.08;
    sprite.scale.set(s, s, 1);
    sprite.position.set(
      pgEnlargerModel.position.x + (Math.random() - 0.5) * 1.5,
      pgEnlargerModel.position.y + Math.random() * 3.0,
      pgEnlargerModel.position.z + (Math.random() - 0.5) * 1.5
    );
    sprite.userData = {
      vx:    (Math.random() - 0.5) * 0.012,
      vy:    0.008 + Math.random() * 0.012,
      vz:    (Math.random() - 0.5) * 0.008,
      life:  1.0,
      decay: 0.025 + Math.random() * 0.02,
    };
    pgCornerParticles.push(sprite);
    pgScene.add(sprite);
  }
}

function updateCornerParticles() {
  if (pgIsScrolling) spawnCornerParticles();
  for (var i = pgCornerParticles.length - 1; i >= 0; i--) {
    var s = pgCornerParticles[i];
    var d = s.userData;
    d.life -= d.decay;
    s.position.x += d.vx;
    s.position.y += d.vy;
    s.position.z += d.vz;
    s.material.opacity = d.life * 0.8;
    if (d.life <= 0) {
      pgScene.remove(s);
      pgCornerParticles.splice(i, 1);
    }
  }
}

function stopEnlargerBg() {
  if (pgAnimFrame) { cancelAnimationFrame(pgAnimFrame); pgAnimFrame = null; }
  var canvas = document.getElementById('pg-bg-canvas');
  if (canvas) canvas.classList.remove('visible');
}

function enlargerLoop() {
  pgAnimFrame = requestAnimationFrame(enlargerLoop);

  /* Delta-capped time — prevents jump when tab refocuses */
  var now = performance.now() * 0.001;
  if (!pgLastTime) pgLastTime = now;
  var delta = Math.min(now - pgLastTime, 0.05);
  pgLastTime = now;
  pgTime += delta * 0.5;

  if (pgNoiseUniforms) pgNoiseUniforms.uTime.value = pgTime;

  updateFogParticles();
  updateCornerParticles();

  /* Enlarger — lerped scroll rotation + lerped sway */
  if (pgEnlargerModel) {
    pgScrollRot += (pgScrollRotTarget - pgScrollRot) * 0.04;
    var targetY = pgScrollRot + Math.sin(pgTime * 0.12) * 0.04;
    var targetX = Math.sin(pgTime * 0.07) * 0.03;
    pgEnlargerModel.rotation.y += (targetY - pgEnlargerModel.rotation.y) * 0.08;
    pgEnlargerModel.rotation.x += (targetX - pgEnlargerModel.rotation.x) * 0.08;
  }

  /* Watch — lerped drop + lerped spin */
  if (pgWatchModel && productScroll) {
    var fraction = productScroll.scrollLeft /
      (productScroll.scrollWidth - productScroll.clientWidth || 1);
    var watchTargetY = 4.5 - (fraction * 10.0);
    pgWatchModel.position.y += (watchTargetY - pgWatchModel.position.y) * 0.05;
    pgWatchModel.rotation.y += (pgTime * 0.3 - pgWatchModel.rotation.y) * 0.08;
  }

  /* Camera gentle drift */
  if (pgCamera) {
    pgCamera.position.x = Math.sin(pgTime * 0.09) * 0.25;
    pgCamera.position.y = 0.5 + Math.sin(pgTime * 0.06) * 0.15;
    pgCamera.lookAt(0, 0, 0);
  }

  if (pgRenderer && pgScene && pgCamera) {
    pgRenderer.autoClear = false;
    pgRenderer.clearDepth();
    pgRenderer.autoClearColor = false;
    if (pgNoiseScene && pgNoiseCamera) {
      pgRenderer.autoClear = true;
      pgRenderer.render(pgNoiseScene, pgNoiseCamera);
      pgRenderer.autoClear = false;
    }
    pgRenderer.clearDepth();
    pgRenderer.render(pgScene, pgCamera);
  }
}

/* ═══════════════════════════════════════════════════════
   TIME-OF-DAY MOOD SYSTEM
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
