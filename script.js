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
  glScene = new THREE.Scene();
  glCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const texCanvas = document.createElement('canvas');
  texCanvas.width = 2; texCanvas.height = 2;
  const ctx = texCanvas.getContext('2d');
  ctx.fillStyle = '#111111'; ctx.fillRect(0, 0, 2, 2);
  glUniforms = {
    uTime:       { value: 0 },
    uVelocity:   { value: 0 },
    uIntensity:  { value: 0 },
    uTexture:    { value: new THREE.CanvasTexture(texCanvas) },
    uResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) }
  };
  const mat = new THREE.ShaderMaterial({
    vertexShader: VERT_SHADER, fragmentShader: FRAG_SHADER,
    uniforms: glUniforms, transparent: true, blending: THREE.NormalBlending
  });
  glMesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat);
  glScene.add(glMesh);
  window.addEventListener('resize', () => {
    glRenderer.setSize(window.innerWidth, window.innerHeight);
    glUniforms.uResolution.value.set(window.innerWidth, window.innerHeight);
  });
}

function glRenderLoop(ts) {
  requestAnimationFrame(glRenderLoop);
  glVelocity  += (glTargetVel - glVelocity)  * 0.12;
  glIntensity += (glTargetInt - glIntensity) * 0.08;
  glTargetVel *= 0.88; glTargetInt *= 0.92;
  glUniforms.uTime.value      = ts * 0.001;
  glUniforms.uVelocity.value  = glVelocity;
  glUniforms.uIntensity.value = glIntensity;
  glRenderer.render(glScene, glCamera);
}

function triggerGLGlitch(velocity) {
  if (!glUniforms) return;
  glTargetVel = Math.min(velocity / 800, 1.0);
  glTargetInt = 0.4 + glTargetVel * 0.6;
}

initGL();
if (glRenderer) glRenderLoop(0);

window.addEventListener('scroll', () => {
  const currentY = window.pageYOffset;
  const delta = Math.abs(currentY - glLastY);
  glLastY = currentY;
  if (delta > 2) triggerGLGlitch(delta * 8);
}, { passive: true });

/* ═══════════════════════════════════════════════════════
   HERO SEQUENCE — tab-aware, no drift
════════════════════════════════════════════════════════ */
(function () {
  const photos = [
    'images/fashion-editorial-bangalore-1.webp',
    'images/fashion-model-studio-2.webp',
    'images/fashion-portrait-lighting-3.webp',
    'images/catalogue-product-shoot-4.webp',
    'images/product-photography-bangalore-1.webp',
    'images/studio-fashion-portrait-6.webp'
  ];
  const sequence = [
    [0, 3000], [null, 1500], [1, 2800], [null, 2000], [2, 3200],
    [null, 1200], [3, 2500], [null, 2500], [4, 3000], [null, 1800], [5, 2800], [null, 2000]
  ];
  const overlay = document.getElementById('hero-overlay');
  if (!overlay) return;

  let step = 0;
  let timerId = null;
  let paused = false;

  function next() {
    if (paused) return;
    const [photoIndex, duration] = sequence[step];
    if (photoIndex === null) {
      overlay.style.opacity = '0';
    } else {
      overlay.style.backgroundImage = `url('${photos[photoIndex]}')`;
      overlay.style.opacity = '1';
    }
    step = (step + 1) % sequence.length;
    timerId = setTimeout(next, duration);
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      paused = true;
      clearTimeout(timerId);
    } else {
      paused = false;
      next();
    }
  });

  timerId = setTimeout(next, 800);
})();

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
    if (Math.abs(currentY - lastScrollY) > 35) {
      createMoshStamp(currentY);
      lastScrollY = currentY;
    }
    document.body.classList.toggle('scrolled', currentY > 50);
    scrollTicking = false;
  });
}, { passive: true });

function attachHorizontalWheel(el) {
  if (!el) return;
  el.addEventListener('wheel', (e) => {
    if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
    e.preventDefault();
    el.scrollLeft += e.deltaY;
  }, { passive: false });
}

attachHorizontalWheel(albumScroll);

albumScroll.addEventListener('scroll', () => {
  if (albumTicking) return;
  albumTicking = true;
  requestAnimationFrame(() => {
    if (Math.abs(albumScroll.scrollLeft - lastScrollX) > 15) {
      triggerAsdf();
      lastScrollX = albumScroll.scrollLeft;
    }
    albumTicking = false;
  });
}, { passive: true });

function togglePortfolio(open) {
  isAlbumOpen = open;
  portfolioPage.classList.toggle('active', open);
  document.body.style.overflow = open ? 'hidden' : 'auto';
}

/* ══════════════════════════════════════
   PRODUCT GALLERY
══════════════════════════════════════ */
const productPage   = document.getElementById('product-page');
const productScroll = document.getElementById('product-scroll');

attachHorizontalWheel(productScroll);

let pgScrollRotTarget = 0;
let pgIsScrolling     = false;
let pgScrollTimer     = null;

if (productScroll) {
  productScroll.addEventListener('scroll', () => {
    const fraction = productScroll.scrollLeft /
      (productScroll.scrollWidth - productScroll.clientWidth || 1);
    pgScrollRotTarget = fraction * Math.PI * 2;
    pgIsScrolling = true;
    clearTimeout(pgScrollTimer);
    pgScrollTimer = setTimeout(() => { pgIsScrolling = false; }, 150);
  }, { passive: true });
}

function toggleProductGallery(open) {
  productPage.classList.toggle('active', open);
  document.body.style.overflow = open ? 'hidden' : 'auto';
  if (open) {
    if (productScroll) productScroll.scrollLeft = 0;
    initEnlargerBg();
    setTimeout(() => {
      if (productScroll) productScroll.classList.add('ready');
    }, 800);
  } else {
    if (productScroll) productScroll.classList.remove('ready');
    stopEnlargerBg();
  }
}

/* ══ DURST ENLARGER 3D BACKGROUND ══ */
let pgRenderer    = null, pgScene   = null, pgCamera  = null;
let pgNoiseScene  = null, pgNoiseCamera = null;
let pgAnimFrame   = null, pgEnlargerModel = null;
let pgWatchModel  = null;
let pgBgInited    = false, pgTime = 0, pgLastTime = null;
let pgNoiseMesh   = null, pgNoiseUniforms = null;
let pgScrollRot   = 0;
let pgModelFailed = false;

const PG_NOISE_VERT = `
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = vec4(position, 1.0); }
`;
const PG_NOISE_FRAG = `
  uniform float uTime;
  uniform vec2  uRes;
  varying vec2  vUv;
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p); vec2 f = fract(p);
    f = f*f*(3.0-2.0*f);
    return mix(mix(hash(i), hash(i+vec2(1,0)), f.x), mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), f.x), f.y);
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
    vec3 grad = mix(vec3(0.05, 0.0, 0.14), vec3(0.38, 0.09, 0.01), vUv.y);
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

function showBgFallback() {
  const canvas = document.getElementById('pg-bg-canvas');
  if (canvas) canvas.classList.add('visible');
  if (productScroll) productScroll.classList.add('ready');
}

function initEnlargerBg() {
  const canvas = document.getElementById('pg-bg-canvas');
  if (!canvas) return;
  if (pgBgInited) { if (!pgAnimFrame) enlargerLoop(); return; }
  if (typeof THREE === 'undefined') { showBgFallback(); return; }

  pgBgInited = true;

  pgRenderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  pgRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  pgRenderer.setClearColor(0x000000, 0);
  pgRenderer.setSize(window.innerWidth, window.innerHeight);
  pgRenderer.toneMapping = THREE.ACESFilmicToneMapping;
  pgRenderer.toneMappingExposure = 1.1;
  pgRenderer.outputEncoding = THREE.sRGBEncoding;

  pgScene  = new THREE.Scene();
  pgCamera = new THREE.PerspectiveCamera(38, window.innerWidth / window.innerHeight, 0.1, 200);
  pgCamera.position.set(0, 0.5, 7.0);
  pgCamera.lookAt(0, 0, 0);

  pgNoiseUniforms = {
    uTime: { value: 0.0 },
    uRes:  { value: new THREE.Vector2(window.innerWidth, window.innerHeight) }
  };
  const noiseMat = new THREE.ShaderMaterial({
    uniforms: pgNoiseUniforms, vertexShader: PG_NOISE_VERT,
    fragmentShader: PG_NOISE_FRAG, depthWrite: false, depthTest: false, transparent: true
  });
  pgNoiseMesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), noiseMat);
  pgNoiseMesh.frustumCulled = false;
  pgNoiseScene  = new THREE.Scene();
  pgNoiseCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  pgNoiseScene.add(pgNoiseMesh);

  pgScene.add(new THREE.HemisphereLight(0x2a0010, 0x080015, 0.2));
  const backLight = new THREE.PointLight(0xff2255, 28, 15, 0.1);
  backLight.position.set(-4, 2, -3); pgScene.add(backLight);
  const fill = new THREE.PointLight(0xff1144, 5, 60, 0.1);
  fill.position.set(6, 6, 5); pgScene.add(fill);
  const rim = new THREE.PointLight(0x880033, 6, 20, 2.8);
  rim.position.set(3, 5, -5); pgScene.add(rim);

  /* Start noise loop immediately so bg isn't blank while model loads */
  enlargerLoop();

  /* ── Loading tracker ── */
  const loaderEl  = document.getElementById('pg-loader');
  const pctEl     = document.getElementById('pg-loader-pct');
  let enlargerPct = 0;
  let watchPct    = 0;

  function updatePct() {
  const total = Math.round(enlargerPct * 0.8 + watchPct * 0.2);

  let stage;
  if      (total < 25)  stage = 'DEVELOPER';
  else if (total < 55)  stage = 'STOP_BATH';
  else if (total < 80)  stage = 'FIXER';
  else if (total < 100) stage = 'WASH';
  else                  stage = 'READY //';

  if (pctEl) pctEl.textContent = total < 100
    ? `${stage} // ${total}%`
    : stage;

  if (total >= 100 && loaderEl) {
    setTimeout(() => loaderEl.classList.add('hidden'), 800);
  }
}

  const loader = new THREE.GLTFLoader();
  loader.load(
    'models/durst_enlarger_darkroom_asset.glb',
    (gltf) => {
      enlargerPct = 100;
      updatePct();

      pgEnlargerModel = gltf.scene;
      pgEnlargerModel.traverse((n) => {
        if (!n.isMesh) return;
        n.material = new THREE.MeshPhysicalMaterial({
          color: new THREE.Color(0xffffff), metalness: 0.3, roughness: 0.0,
          transmission: 1.0, thickness: 3.5, ior: 2.5,
          transparent: true, opacity: 1.0, envMapIntensity: 2.5
        });
        n.castShadow = true; n.receiveShadow = true;
      });
      const box = new THREE.Box3().setFromObject(pgEnlargerModel);
      const sz  = new THREE.Vector3(); box.getSize(sz);
      const ctr = new THREE.Vector3(); box.getCenter(ctr);
      const sc  = 2.9 / Math.max(sz.x, sz.y, sz.z);
      pgEnlargerModel.scale.setScalar(sc);
      pgEnlargerModel.position.set(-ctr.x * sc, -ctr.y * sc, -ctr.z * sc);
      pgScene.add(pgEnlargerModel);

      const cubeRT = new THREE.WebGLCubeRenderTarget(128, {
        format: THREE.RGBFormat, generateMipmaps: true,
        minFilter: THREE.LinearMipmapLinearFilter
      });
      const cubeCamera = new THREE.CubeCamera(0.1, 100, cubeRT);
      pgScene.add(cubeCamera);
      cubeCamera.update(pgRenderer, pgScene);
      pgScene.environment = cubeRT.texture;
      pgEnlargerModel.traverse((n) => {
        if (n.isMesh && n.material) n.material.envMap = cubeRT.texture;
      });

      canvas.classList.add('visible');
      if (productScroll) productScroll.classList.add('ready');

      /* Load watch */
      const loader2 = new THREE.GLTFLoader();
      loader2.load(
        'models/stopwatch-284.glb',
        (gltf2) => {
          watchPct = 100;
          updatePct();

          pgWatchModel = gltf2.scene;
          pgWatchModel.traverse((n) => {
            if (!n.isMesh) return;
            n.material = new THREE.MeshStandardMaterial({
              color: new THREE.Color(0xd0c8d8), metalness: 1.0,
              roughness: 0.04, envMapIntensity: 2.0
            });
            n.castShadow = false; n.receiveShadow = false; n.renderOrder = 1;
            if (n.material) n.material.envMap = cubeRT.texture;
          });
          const box2 = new THREE.Box3().setFromObject(pgWatchModel);
          const sz2  = new THREE.Vector3(); box2.getSize(sz2);
          const ctr2 = new THREE.Vector3(); box2.getCenter(ctr2);
          const sc2  = 2.0 / Math.max(sz2.x, sz2.y, sz2.z);
          pgWatchModel.scale.setScalar(sc2);
          pgWatchModel.position.set(-ctr2.x * sc2, -ctr2.y * sc2 + 6.0, -ctr2.z * sc2);
          pgScene.add(pgWatchModel);
        },
        (xhr2) => {                               /* watch progress */
          if (xhr2.lengthComputable) {
            watchPct = (xhr2.loaded / xhr2.total) * 100;
            updatePct();
          }
        },
        () => {                                   /* watch load fail — silent */
          watchPct = 100;
          updatePct();
        }
      );
    },
    (xhr) => {                                    /* enlarger progress */
      if (xhr.lengthComputable) {
        enlargerPct = (xhr.loaded / xhr.total) * 100;
        updatePct();
      }
    },
    () => {
      /* Enlarger load fail — show noise bg + scroll, no crash */
      pgModelFailed = true;
      enlargerPct = 100; watchPct = 100;
      updatePct();
      canvas.classList.add('visible');
      showBgFallback();
    }
  );
}

function stopEnlargerBg() {
  if (pgAnimFrame) { cancelAnimationFrame(pgAnimFrame); pgAnimFrame = null; }
  const canvas = document.getElementById('pg-bg-canvas');
  if (canvas) canvas.classList.remove('visible');
}

function enlargerLoop() {
  pgAnimFrame = requestAnimationFrame(enlargerLoop);
  const now = performance.now() * 0.001;
  if (!pgLastTime) pgLastTime = now;
  const delta = Math.min(now - pgLastTime, 0.05);
  pgLastTime = now;
  pgTime += delta * 0.5;

  if (pgNoiseUniforms) pgNoiseUniforms.uTime.value = pgTime;

  if (pgEnlargerModel) {
    pgScrollRot += (pgScrollRotTarget - pgScrollRot) * 0.04;
    const targetY = pgScrollRot + Math.sin(pgTime * 0.12) * 0.04;
    const targetX = Math.sin(pgTime * 0.07) * 0.03;
    pgEnlargerModel.rotation.y += (targetY - pgEnlargerModel.rotation.y) * 0.08;
    pgEnlargerModel.rotation.x += (targetX - pgEnlargerModel.rotation.x) * 0.08;
  }

  if (pgWatchModel && productScroll) {
    const fraction = productScroll.scrollLeft /
      (productScroll.scrollWidth - productScroll.clientWidth || 1);
    const watchTargetY = 4.5 - (fraction * 10.0);
    pgWatchModel.position.y += (watchTargetY - pgWatchModel.position.y) * 0.05;
    pgWatchModel.rotation.y += (pgTime * 0.3 - pgWatchModel.rotation.y) * 0.08;
  }

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
  dawn:      { label: 'DAWN_LIGHT',  heroFilter: 'brightness(0.6) saturate(0.5) hue-rotate(200deg)',              triggerFilter: 'grayscale(0.8) brightness(0.25) hue-rotate(180deg)', tint: 'rgba(30,60,120,0.08)' },
  morning:   { label: 'GOLDEN_HOUR', heroFilter: 'brightness(1.1) saturate(1.3) sepia(0.25)',                     triggerFilter: 'grayscale(0.4) brightness(0.35) sepia(0.3)',          tint: 'rgba(255,200,80,0.05)' },
  midday:    { label: 'MIDDAY_FLAT', heroFilter: 'brightness(1.3) saturate(0.7) contrast(1.2)',                   triggerFilter: 'grayscale(0.6) brightness(0.45) contrast(1.1)',       tint: 'rgba(255,255,240,0.04)' },
  afternoon: { label: 'AMBER_HOUR',  heroFilter: 'brightness(1.0) saturate(1.5) sepia(0.4) hue-rotate(-10deg)',  triggerFilter: 'grayscale(0.2) brightness(0.4) sepia(0.4)',           tint: 'rgba(200,100,20,0.06)' },
  night:     { label: 'NIGHT_MODE',  heroFilter: 'brightness(0.7) saturate(0.3) hue-rotate(220deg)',             triggerFilter: 'grayscale(1) brightness(0.2) hue-rotate(200deg)',     tint: 'rgba(10,10,40,0.12)' },
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
document.querySelectorAll('#album-scroll img, #product-scroll img').forEach(img => {
  img.addEventListener('contextmenu', e => e.preventDefault());
  img.addEventListener('dragstart', e => e.preventDefault());
});

document.addEventListener('keydown', e => {
  if (e.key === 'F12' || (e.ctrlKey && e.shiftKey && ['I','J','C'].includes(e.key)) || (e.ctrlKey && e.key === 'u')) {
    e.preventDefault();
  }
});

/* ═══════════════════════════════════════════════════════
   PATCH: 3D MONITOR DISPLAY — Behind Scroll Hint
   Minimal addition: GLB + vertical video, auto-play muted
════════════════════════════════════════════════════════ */

(function initMonitorPatch() {
  if (typeof THREE === 'undefined') return;
  
  const hints = document.querySelectorAll('.scroll-hint, [class*="hint"]');
  if (hints.length === 0) return;
  
  const hintEl = hints[0];
  
  const container = document.createElement('div');
  container.id = 'monitor-patch-container';
  container.style.cssText = `
    position: absolute;
    width: 300px;
    height: 400px;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    z-index: -1;
    pointer-events: none;
  `;
  
  const canvas = document.createElement('canvas');
  container.appendChild(canvas);
  hintEl.parentElement.insertBefore(container, hintEl);
  
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, 300 / 400, 0.1, 1000);
  camera.position.z = 3;
  
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  renderer.setSize(300, 400);
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  
  // Minimal lighting
  const light1 = new THREE.PointLight(0xffffff, 2, 10);
  light1.position.set(2, 3, 2);
  scene.add(light1);
  
  const light2 = new THREE.PointLight(0x8888ff, 1, 8);
  light2.position.set(-2, 1, 2);
  scene.add(light2);
  
  scene.add(new THREE.AmbientLight(0x333333, 1));
  
  // Load monitor GLB + video
  const gltfLoader = new THREE.GLTFLoader();
  let videoTexture = null;
  
  gltfLoader.load('portfolio/models/display_terminal.glb', (gltf) => {
    const monitor = gltf.scene;
    monitor.scale.set(2, 2, 2);
    monitor.rotation.y = 0.2;
    monitor.rotation.x = 0.1;
    
    if (videoTexture) {
      monitor.traverse((node) => {
        if (node.isMesh) {
          node.material.map = videoTexture;
          node.material.emissiveMap = videoTexture;
          node.material.emissiveIntensity = 0.7;
          node.castShadow = true;
        }
      });
    }
    
    scene.add(monitor);
    
    // Gentle rotation
    function rotateMonitor() {
      requestAnimationFrame(rotateMonitor);
      monitor.rotation.y += 0.0008;
      renderer.render(scene, camera);
    }
    rotateMonitor();
  });
  
  // Video setup
  const video = document.createElement('video');
  video.src = 'portfolio/videos/hb_1783348123181fashion_photographer_whitefield.mp4';
  video.autoplay = true;
  video.muted = true;
  video.loop = true;
  video.playsInline = true;
  
  video.addEventListener('loadeddata', () => {
    videoTexture = new THREE.VideoTexture(video);
    videoTexture.minFilter = THREE.LinearFilter;
    videoTexture.magFilter = THREE.LinearFilter;
  });
  
  video.play().catch(() => {});
  
  // Handle resize
  window.addEventListener('resize', () => {
    renderer.setSize(300, 400);
  });
})();
