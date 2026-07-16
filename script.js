/* ═══════════════════════════════════════════════════════
   SITE LOADER — tracks REAL loading progress of the hero photos, the
   projector GLB, and the showreel video. The rest of the page stays
   hidden (body.loading) until it hits 100%, so the visitor never lands
   mid-scroll on half-loaded assets. A safety timeout guarantees no one
   gets stuck staring at a stalled screen if something fails to load.
════════════════════════════════════════════════════════ */
(function () {
  const loaderEl = document.getElementById('site-loader');
  const pctEl    = document.getElementById('site-loader-pct');
  if (!loaderEl || !pctEl) return;

  document.body.classList.add('loading');

  const HERO_IMAGES = [
    'images/fashion-editorial-bangalore-1.webp',
    'images/fashion-model-studio-2.webp',
    'images/fashion-portrait-lighting-3.webp',
    'images/catalogue-product-shoot-4.webp',
    'images/product-photography-bangalore-1.webp',
    'images/studio-fashion-portrait-6.webp'
  ];

  const progress = {}; // key -> { weight, value(0..1) }
  function setProgress(key, weight, value) {
    progress[key] = { weight, value: Math.max(0, Math.min(1, value)) };
    recompute();
  }

  function recompute() {
    let doneW = 0, totW = 0;
    Object.values(progress).forEach(p => { totW += p.weight; doneW += p.weight * p.value; });
    const pct = totW > 0 ? Math.round((doneW / totW) * 100) : 0;
    pctEl.textContent = String(pct).padStart(2, '0');
    if (pct >= 100) finish();
  }

  let finished = false;
  function finish() {
    if (finished) return;
    finished = true;
    setTimeout(() => {
      loaderEl.classList.add('loader-hidden');
      document.body.classList.remove('loading');
    }, 300);
  }

  // Hero images — 30%
  setProgress('hero', 30, 0);
  let heroLoaded = 0;
  HERO_IMAGES.forEach((src) => {
    const img = new Image();
    img.onload = img.onerror = () => {
      heroLoaded++;
      setProgress('hero', 30, heroLoaded / HERO_IMAGES.length);
    };
    img.src = src;
  });

  // Projector GLB — 40% (biggest single asset). The projector engine
  // further down calls window.__reportProjectorProgress from its
  // GLTFLoader onProgress callback.
  setProgress('projector', 40, 0);
  window.__reportProjectorProgress = (fraction) => setProgress('projector', 40, fraction);

  // Showreel video — 30%
  setProgress('video', 30, 0);
  const showreelVideoEl = document.getElementById('showreelVideo');
  if (showreelVideoEl) {
    const onVideoProgress = () => {
      if (showreelVideoEl.readyState >= 3) {
        setProgress('video', 30, 1);
        showreelVideoEl.removeEventListener('progress', onVideoProgress);
        showreelVideoEl.removeEventListener('canplay', onVideoProgress);
        showreelVideoEl.removeEventListener('loadeddata', onVideoProgress);
      }
    };
    showreelVideoEl.addEventListener('progress', onVideoProgress);
    showreelVideoEl.addEventListener('canplay', onVideoProgress);
    showreelVideoEl.addEventListener('loadeddata', onVideoProgress);
  } else {
    setProgress('video', 30, 1);
  }

  // Safety net — force-complete after 9s no matter what, so a slow
  // connection or a failed asset never leaves someone stuck.
  setTimeout(() => {
    setProgress('hero', 30, 1);
    setProgress('projector', 40, 1);
    setProgress('video', 30, 1);
  }, 9000);
})();

/* ═══════════════════════════════════════════════════════
   WINDER GEAR PATH — generates the wavy zigzag gear-tooth outline used
   as the crank-arm loader's clip-path. Pure math, runs once on load.
════════════════════════════════════════════════════════ */
(function () {
  const pathEl = document.getElementById('winder-gear-path');
  if (!pathEl) return;

  const points = 360;
  const teeth = 12;
  const thickness = 0.022;
  const baseRadius = 0.42;
  const amplitude = 0.04;

  function getWaveOffset(angle) {
    const phase = (angle * teeth) % (Math.PI * 2);
    if (phase < Math.PI) {
      const xVal = (phase - Math.PI / 2) / (Math.PI / 2);
      return Math.sqrt(Math.max(0, 1 - xVal * xVal));
    } else {
      const xVal = (phase - 3 * Math.PI / 2) / (Math.PI / 2);
      return -Math.sqrt(Math.max(0, 1 - xVal * xVal));
    }
  }

  let d = '';
  for (let i = 0; i <= points; i++) {
    const angle = (i / points) * Math.PI * 2;
    const wave = getWaveOffset(angle);
    const r = baseRadius + (wave * amplitude);
    const x = 0.5 + Math.cos(angle) * r;
    const y = 0.5 + Math.sin(angle) * r;
    d += (i === 0 ? 'M ' : 'L ') + x + ',' + y + ' ';
  }
  for (let i = points; i >= 0; i--) {
    const angle = (i / points) * Math.PI * 2;
    const wave = getWaveOffset(angle);
    const r = (baseRadius - thickness) + (wave * amplitude);
    const x = 0.5 + Math.cos(angle) * r;
    const y = 0.5 + Math.sin(angle) * r;
    d += 'L ' + x + ',' + y + ' ';
  }
  d += 'Z';
  pathEl.setAttribute('d', d);
})();

/* ═══════════════════════════════════════════════════════
   SHARED DRACO LOADER — attached to every GLTFLoader below. Only kicks in
   if a GLB is actually Draco-compressed (smaller downloads, faster GPU
   upload); has zero effect on files that aren't, so this is safe to leave
   wired in regardless of whether any current asset is compressed yet.
════════════════════════════════════════════════════════ */
let sharedDracoLoader = null;
if (window.THREE && THREE.DRACOLoader) {
  sharedDracoLoader = new THREE.DRACOLoader();
  sharedDracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');
}

/* ═══════════════════════════════════════════════════════
   UNIFIED WEBGL LAYER — background glitch shader + 3D projector,
   consolidated into ONE WebGLRenderer/canvas instead of two separate
   GPU contexts. Two scenes (glitch ortho pass, projector perspective
   pass) render sequentially into the same canvas each frame via
   autoClear toggling — the same compositing technique already used
   elsewhere on this site (see enlargerLoop's noise+model layering).
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
let sceneRenderer, glScene, glCamera, glMesh, glUniforms;
let glVelocity = 0, glIntensity = 0, glTargetVel = 0, glTargetInt = 0, glLastY = window.pageYOffset;

let projectorScene, projectorCamera, projectorModel, leftReel, rightReel, lensMesh;
let projectorEngineReady = false;

function initUnifiedGL() {
  if (!window.THREE) return;
  sceneRenderer = new THREE.WebGLRenderer({ canvas: glCanvas, alpha: true, antialias: true });
  sceneRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  sceneRenderer.setSize(window.innerWidth, window.innerHeight, false);
  sceneRenderer.setClearColor(0x000000, 0);
  sceneRenderer.outputEncoding = THREE.sRGBEncoding;

  // --- Glitch pass ---
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

  // --- Projector pass ---
  projectorScene = new THREE.Scene();
  projectorCamera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
  projectorCamera.position.set(0, 0, 8);
  projectorCamera.lookAt(0, 0, 0);
  projectorScene.add(new THREE.AmbientLight(0xffffff, 0.35));
  const dirLight = new THREE.DirectionalLight(0xffffff, 1.3);
  dirLight.position.set(5, 8, 5);
  projectorScene.add(dirLight);

  let lastKnownWidth = window.innerWidth;
  window.addEventListener('resize', () => {
    sceneRenderer.setSize(window.innerWidth, window.innerHeight, false);
    glUniforms.uResolution.value.set(window.innerWidth, window.innerHeight);
    // Mobile browsers fire 'resize' when the URL bar collapses/expands
    // during scroll, changing innerHeight with no real resize happening —
    // only react to actual width changes for the projector's camera aspect
    // (a real resize or orientation change), or it silently "contracts"
    // the model mid-scroll every time the URL bar toggles.
    if (window.innerWidth === lastKnownWidth) return;
    lastKnownWidth = window.innerWidth;
    projectorCamera.aspect = window.innerWidth / window.innerHeight;
    projectorCamera.updateProjectionMatrix();
  });

  loadProjectorModel();
}

function loadProjectorModel() {
  const loader = new THREE.GLTFLoader();
  if (sharedDracoLoader) loader.setDRACOLoader(sharedDracoLoader);
  loader.load(
    'models/call_of_duty_infinite_warfare_projector.glb',
    (gltf) => {
      projectorModel = gltf.scene;

      projectorModel.traverse((child) => {
        if (child.isMesh) {
          const name = child.name.toLowerCase();
          if (name.includes('reel') || name.includes('wheel') || name.includes('gear')) {
            if (name.includes('01') || name.includes('front') || name.includes('l')) leftReel = child;
            if (name.includes('02') || name.includes('back') || name.includes('r')) rightReel = child;
          }
          if (name.includes('lens') || name.includes('glass') || name.includes('optic')) {
            lensMesh = child;
          }
        }
      });

      // Auto-fit: game-ripped GLBs come in at arbitrary scale/pivot.
      const box = new THREE.Box3().setFromObject(projectorModel);
      const size = new THREE.Vector3();
      box.getSize(size);
      const center = new THREE.Vector3();
      box.getCenter(center);
      const maxDim = Math.max(size.x, size.y, size.z) || 1;
      const fitScale = 1.7 / maxDim;
      projectorModel.scale.setScalar(fitScale);
      projectorModel.position.sub(center.multiplyScalar(fitScale));

      // Narrow (portrait/mobile) viewports have a much tighter HORIZONTAL
      // field of view than vertical at a fixed vertical FOV camera — push
      // the camera back based on the ACTUAL current aspect ratio so it
      // always fits both dimensions instead of clipping off an edge.
      const aspect = window.innerWidth / window.innerHeight;
      const vFovRad = projectorCamera.fov * Math.PI / 180;
      const hFovRad = 2 * Math.atan(Math.tan(vFovRad / 2) * aspect);
      const requiredDist = (1.7 * 0.75) / Math.tan(hFovRad / 2);
      projectorCamera.position.z = Math.max(8, requiredDist);
      projectorBaseCameraZ = projectorCamera.position.z;
      projectorCamera.updateProjectionMatrix();

      projectorModel.rotation.set(0.3, Math.PI / 2, 0);
      projectorModel.position.x = 0;
      projectorModel.position.y -= 0.65;
      projectorModel.position.z -= 1;
      projectorModel.visible = false;
      projectorScene.add(projectorModel);

      projectorEngineReady = true;
      if (window.__reportProjectorProgress) window.__reportProjectorProgress(1);
    },
    (xhr) => {
      if (xhr.lengthComputable && window.__reportProjectorProgress) {
        window.__reportProjectorProgress(xhr.loaded / xhr.total);
      }
    },
    (err) => {
      console.error('[projector] GLB failed to load', err);
      if (window.__reportProjectorProgress) window.__reportProjectorProgress(1);
    }
  );
}

function easeInOutCubic(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
function easeInCubic(t) { return t * t * t; }

let projectorBaseCameraZ = 8;
let projectorLastScrollY = window.scrollY;

/* ═══════════════════════════════════════════════════════
   PROJECTOR SCROLL UPDATE — same pattern as the product-gallery
   enlarger's smoothing loop: recompute live scroll position fresh
   every single frame (no cached trigger boundaries to drift out of
   sync), then LERP the actual object properties toward the freshly-
   computed target each frame. Called from unifiedRenderLoop.
════════════════════════════════════════════════════════ */
let projectorWasActive = false;

// Hysteresis / debounce + smooth reset state to avoid popping on small
// viewport/layout jitters (mobile address bar collapse/expand, sub-pixel
// changes, etc.). These replace the previous immediate visible toggle
// and hard reset that caused the snap.
let projectorWantedActive = false;
let projectorActivationCounter = 0;
let projectorResetting = false;
let projectorResetStart = 0;
let projectorResetFrom = null;
let projectorResetTo = null;
const ACTIVATION_ENTER_PX = -16; // hint bottom must be this far past top to enter
const ACTIVATION_EXIT_PX  =  24; // must be this far back to exit
const ACTIVATION_DEBOUNCE_FRAMES = 3; // ~50ms at 60fps
const RESET_DURATION = 220; // ms to smoothly interpolate into the "placed" pose

function updateProjectorScroll() {
  if (!projectorEngineReady || !projectorModel) return;

  const hintEl = document.getElementById('scroll-hint');
  const trackEl = document.getElementById('showreel-3d-track');
  if (!hintEl || !trackEl) return;

  const hintBottomY = hintEl.getBoundingClientRect().bottom;
  const trackTopY   = trackEl.getBoundingClientRect().top;
  const totalSpan   = hintBottomY - trackTopY; // recomputed fresh every frame — self-correcting, nothing cached to go stale

  // HYSTERESIS: use stable pixel thresholds rather than a fragile boolean
  // that can flip for a single frame when the URL bar or layout nudges.
  const enter = hintBottomY <= ACTIVATION_ENTER_PX && trackTopY > 0;
  const exit  = hintBottomY > ACTIVATION_EXIT_PX || trackTopY <= 0;

  if (enter) projectorWantedActive = true;
  if (exit)  projectorWantedActive = false;

  if (projectorWantedActive !== projectorWasActive) {
    // debounce change for a few frames to avoid single-frame flips
    projectorActivationCounter++;
    if (projectorActivationCounter >= ACTIVATION_DEBOUNCE_FRAMES) {
      projectorWasActive = projectorWantedActive;
      projectorActivationCounter = 0;

      // toggle visibility only when the state actually flips
      projectorModel.visible = projectorWasActive;

      if (projectorWasActive) {
        // start a short smooth reset instead of an instant hard snap
        projectorResetting = true;
        projectorResetStart = performance.now();
        projectorResetFrom = {
          rotY: projectorModel.rotation.y,
          posZ: projectorModel.position.z,
          camZ: projectorCamera.position.z
        };
        projectorResetTo = {
          rotY: Math.PI / 2,
          posZ: -1,
          camZ: projectorBaseCameraZ
        };
      } else {
        // leaving the zone — we simply hide the model (already set above)
        // and clear any pending reset state.
        projectorResetting = false;
      }
    }
  } else {
    projectorActivationCounter = 0;
  }

  // If we're currently performing the smooth "placed" reset, just
  // interpolate the few properties we want and skip the rest of the
  // per-frame motion until the interpolation completes. This removes
  // the instant snap that was visible when the old code set values
  // immediately.
  if (projectorResetting) {
    const t = Math.min(1, (performance.now() - projectorResetStart) / RESET_DURATION);
    const eased = easeInOutCubic(t);
    projectorModel.rotation.y = THREE.MathUtils.lerp(projectorResetFrom.rotY, projectorResetTo.rotY, eased);
    projectorModel.position.z   = THREE.MathUtils.lerp(projectorResetFrom.posZ, projectorResetTo.posZ, eased);
    projectorCamera.position.z   = THREE.MathUtils.lerp(projectorResetFrom.camZ, projectorResetTo.camZ, eased);
    projectorCamera.updateProjectionMatrix();
    if (t >= 1) projectorResetting = false;
    return; // don't apply further scroll-driven motion until reset done
  }

  if (!projectorWasActive) return;

  const raw = Math.abs(totalSpan) > 1 ? Math.max(0, Math.min(1, hintBottomY / totalSpan)) : 0;

  // A flat hold at the very start — the model sits still, fully placed,
  // for the first 10% of this section's scroll before any motion begins
  // at all. Combined with the hard reset above, this is what actually
  // kills the snap: there's no motion happening at the instant it appears.
  const HOLD = 0.10;
  const moveRaw = Math.max(0, Math.min(1, (raw - HOLD) / (1 - HOLD)));

  // Phase A (first ~55% of the remaining motion): profile → 90° turn.
  // Phase B (rest): camera dive into the lens — pushed slightly later so
  // the zoom doesn't begin before the turn has clearly progressed.
  const phaseARaw = Math.max(0, Math.min(1, moveRaw / 0.55));
  const phaseBRaw = Math.max(0, Math.min(1, (moveRaw - 0.55) / 0.45));
  const phaseA = easeInOutCubic(phaseARaw);
  const phaseB = easeInCubic(phaseBRaw);

  const targetRotY = THREE.MathUtils.lerp(Math.PI / 2, Math.PI, phaseA);
  const targetPosZ = THREE.MathUtils.lerp(-1, 1.5, phaseA);

  // Smooth catch-up toward the target — this IS the "scrub lag" feel,
  // just computed as a plain per-frame lerp instead of GSAP scrub.
  projectorModel.rotation.y += (targetRotY - projectorModel.rotation.y) * 0.12;
  projectorModel.position.z += (targetPosZ - projectorModel.position.z) * 0.12;

  if (lensMesh) {
    const lensWorld = new THREE.Vector3();
    lensMesh.getWorldPosition(lensWorld);
    const targetCamX = phaseBRaw > 0 ? lensWorld.x : projectorCamera.position.x;
    const targetCamY = phaseBRaw > 0 ? lensWorld.y : projectorCamera.position.y;
    const targetCamZ = phaseBRaw > 0 ? (lensWorld.z + 0.15) : projectorBaseCameraZ;
    const camLerp = phaseBRaw > 0 ? (0.06 + phaseB * 0.14) : 0.08; // dives faster as it gets closer
    projectorCamera.position.x += (targetCamX - projectorCamera.position.x) * camLerp;
    projectorCamera.position.y += (targetCamY - projectorCamera.position.y) * camLerp;
    projectorCamera.position.z += (targetCamZ - projectorCamera.position.z) * camLerp;
    projectorCamera.lookAt(lensWorld);
  }

  // Reel spin driven by actual frame-to-frame scroll velocity, not a
  // GSAP-reported value.
  const scrollDelta = window.scrollY - projectorLastScrollY;
  projectorLastScrollY = window.scrollY;
  const spinSpeed = scrollDelta * 0.02;
  if (leftReel) leftReel.rotation.z += spinSpeed;
  if (rightReel) rightReel.rotation.z -= spinSpeed;
}

let glPageHidden = false;
document.addEventListener('visibilitychange', () => {
  glPageHidden = document.hidden;
});

function unifiedRenderLoop(ts) {
  requestAnimationFrame(unifiedRenderLoop);
  if (glPageHidden) return; // tab not visible — don't burn GPU/battery in the background

  updateProjectorScroll();

  glVelocity  += (glTargetVel - glVelocity)  * 0.12;
  glIntensity += (glTargetInt - glIntensity) * 0.08;
  glTargetVel *= 0.88; glTargetInt *= 0.92;
  const glitchActive = !(glVelocity < 0.001 && glIntensity < 0.001 && glTargetVel < 0.001 && glTargetInt < 0.001);
  const projectorActive = !!(projectorModel && projectorModel.visible);

  // Nothing changed since last frame on either layer — skip the redraw
  // entirely rather than paying for a full-screen render for no reason.
  if (!glitchActive && !projectorActive) return;

  glUniforms.uTime.value      = ts * 0.001;
  glUniforms.uVelocity.value  = glVelocity;
  glUniforms.uIntensity.value = glIntensity;

  sceneRenderer.autoClear = true;
  sceneRenderer.render(glScene, glCamera); // background glitch layer, always drawn first (clears the canvas)
  if (projectorActive) {
    sceneRenderer.autoClear = false;
    sceneRenderer.clearDepth();
    sceneRenderer.render(projectorScene, projectorCamera); // projector composited on top, same canvas
  }
}

function triggerGLGlitch(velocity) {
  if (!glUniforms) return;
  glTargetVel = Math.min(velocity / 800, 1.0);
  glTargetInt = 0.4 + glTargetVel * 0.6;
}

initUnifiedGL();
if (sceneRenderer) unifiedRenderLoop(0);

window.addEventListener('scroll', () => {
  const currentY = window.pageYOffset;
  const delta = Math.abs(currentY - glLastY);
  glLastY = currentY;

  // No glitch effect over the showreel video — the video section should
  // read as clean and undistorted, not have the background shader
  // bleeding through it.
  const showreelEl = document.getElementById('showreel-3d-track');
  const overShowreel = showreelEl && (() => {
    const r = showreelEl.getBoundingClientRect();
    return r.top < window.innerHeight && r.bottom > 0;
  })();
  if (overShowreel) {
    glTargetVel = 0;
    glTargetInt = 0;
    return;
  }

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
  // Hero-only: once the hero has fully scrolled out of view, the effect
  // stops entirely rather than following down the rest of the page.
  const heroEl = document.getElementById('hero-section');
  if (heroEl) {
    const heroRect = heroEl.getBoundingClientRect();
    if (heroRect.bottom <= 0) return;
  }
  const existing = container.querySelectorAll('.brush-stamp');
  if (existing.length >= 2) existing[0].remove();
  const vh = window.innerHeight;
  // Only content-flow no-mosh sections (footer, forms, etc.) affect the
  // safe-height clipping — the fixed-position 3D/video layers are handled
  // separately below by physically stripping them out of the clone, since
  // being full-viewport fixed elements they'd otherwise always force
  // safeHeight to 0 and silently disable the whole effect everywhere.
  const noMoshEls = document.querySelectorAll('[data-no-mosh]:not(#showreel-3d-track)');
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
  const clone = master.cloneNode(true);
  // Hide (not remove) video/canvas pixels in the clone so they can't ghost
  // into the scroll-trail. Removing the wrapper elements instead would
  // shrink the clone's total height and desync everything below them from
  // the real page's layout — that's what was making unrelated sections
  // (like PROFILE_DATA) appear to "clone" into the wrong spot further down.
  clone.querySelectorAll('video, canvas').forEach(el => { el.style.visibility = 'hidden'; });
  stamp.appendChild(clone);
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

    // Absolute guarantee against any trailing ghost near the projector/
    // video: the instant we're past the hero, kill any in-flight stamp
    // immediately rather than letting its ~850ms fade-out animation keep
    // playing over content further down the page.
    const heroEl = document.getElementById('hero-section');
    if (heroEl && heroEl.getBoundingClientRect().bottom <= 0) {
      container.querySelectorAll('.brush-stamp').forEach(el => el.remove());
    } else if (Math.abs(currentY - lastScrollY) > 35) {
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

/* (rest of file unchanged) */
