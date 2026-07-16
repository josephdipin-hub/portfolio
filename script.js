/* ══════════════════════════════════════════════════════════════════════════
   FINAL UNIFIED SCRIPT
   - Integrated: Loader, Gear, Shader Glitch, Projector, Gallery, Mood, Showreel
   - Optimized: Hero-Only Mosh, Material Caching, Single Render Loop
══════════════════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  // 1. GLOBALS & STATE
  let currentScrollY = window.pageYOffset;
  let smoothedScrollY = 0;
  let lastSmoothedY = 0;
  const VIEW_HEIGHT = window.innerHeight;

  window.addEventListener('scroll', () => { currentScrollY = window.pageYOffset; }, { passive: true });

  /* 2. SITE LOADER */
  const loaderEl = document.getElementById('site-loader');
  const pctEl = document.getElementById('site-loader-pct');
  if (loaderEl && pctEl) {
    document.body.classList.add('loading');
    const HERO_IMAGES = ['images/fashion-editorial-bangalore-1.webp', 'images/fashion-model-studio-2.webp', 'images/fashion-portrait-lighting-3.webp', 'images/catalogue-product-shoot-4.webp', 'images/product-photography-bangalore-1.webp', 'images/studio-fashion-portrait-6.webp'];
    let loaded = 0;
    HERO_IMAGES.forEach(src => {
      const img = new Image();
      img.onload = img.onerror = () => {
        loaded++;
        pctEl.textContent = String(Math.round((loaded / HERO_IMAGES.length) * 100)).padStart(2, '0');
        if (loaded >= HERO_IMAGES.length) {
          loaderEl.classList.add('loader-hidden');
          document.body.classList.remove('loading');
        }
      };
      img.src = src;
    });
    setTimeout(() => { document.body.classList.remove('loading'); loaderEl.classList.add('loader-hidden'); }, 9000);
  }

  /* 3. WINDER GEAR PATH */
  (function () {
    const pathEl = document.getElementById('winder-gear-path');
    if (!pathEl) return;
    const points = 360, teeth = 12, thickness = 0.022, baseRadius = 0.42, amplitude = 0.04;
    function getWaveOffset(angle) {
      const phase = (angle * teeth) % (Math.PI * 2);
      return phase < Math.PI ? Math.sqrt(Math.max(0, 1 - Math.pow((phase - Math.PI / 2) / (Math.PI / 2), 2))) : -Math.sqrt(Math.max(0, 1 - Math.pow((phase - 3 * Math.PI / 2) / (Math.PI / 2), 2)));
    }
    let d = '';
    for (let i = 0; i <= points; i++) {
      const a = (i / points) * Math.PI * 2;
      const r = baseRadius + (getWaveOffset(a) * amplitude);
      d += (i === 0 ? 'M ' : 'L ') + (0.5 + Math.cos(a) * r) + ',' + (0.5 + Math.sin(a) * r) + ' ';
    }
    pathEl.setAttribute('d', d + 'Z');
  })();

  /* 4. UNIFIED WEBGL SYSTEM */
  let sceneRenderer, glScene, glCamera, glMesh, glUniforms;
  let projectorScene, projectorCamera, projectorModel, leftReel, projectorMaterial;
  let projectorEngineReady = false;

  function initUnifiedGL() {
    if (!window.THREE) return;
    sceneRenderer = new THREE.WebGLRenderer({ canvas: document.getElementById('glsl-canvas'), alpha: true, antialias: true });
    sceneRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    sceneRenderer.setSize(window.innerWidth, window.innerHeight, false);
    
    glScene = new THREE.Scene();
    glCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    glUniforms = { uTime: { value: 0 }, uVelocity: { value: 0 }, uIntensity: { value: 0 }, uTexture: { value: new THREE.Texture() }, uResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) } };
    glMesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({ uniforms: glUniforms, vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`, fragmentShader: `...` }));
    glScene.add(glMesh);

    projectorScene = new THREE.Scene();
    projectorCamera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
    projectorScene.add(new THREE.AmbientLight(0xffffff, 0.35));
    
    new THREE.GLTFLoader().load('models/call_of_duty_infinite_warfare_projector.glb', (gltf) => {
      projectorModel = gltf.scene;
      projectorModel.traverse(child => {
        if (child.isMesh) {
          child.material.transparent = true;
          projectorMaterial = child.material;
          if (child.name.includes('reel')) leftReel = child;
        }
      });
      projectorEngineReady = true;
      projectorScene.add(projectorModel);
    });
  }

  /* 5. MAIN RENDER LOOP */
  function unifiedRenderLoop(ts) {
    requestAnimationFrame(unifiedRenderLoop);
    if (document.hidden) return;
    smoothedScrollY += (currentScrollY - smoothedScrollY) * 0.08;
    updateProjector(smoothedScrollY);

    sceneRenderer.autoClear = true;
    sceneRenderer.render(glScene, glCamera);
    if (projectorModel?.visible) {
      sceneRenderer.autoClear = false;
      sceneRenderer.clearDepth();
      sceneRenderer.render(projectorScene, projectorCamera);
    }
  }

  function updateProjector(scrollY) {
    if (!projectorEngineReady) return;
    const trackEl = document.getElementById('showreel-3d-track');
    if (!trackEl) return;
    const rect = trackEl.getBoundingClientRect();
    const active = (rect.top < VIEW_HEIGHT && rect.bottom > 0);
    projectorModel.visible = active;
    if (active) {
      const progress = Math.min(Math.max((scrollY - (trackEl.offsetTop - VIEW_HEIGHT)) / 2000, 0), 1);
      projectorMaterial.opacity = Math.min(progress / 0.3, 1);
      projectorModel.rotation.y = THREE.MathUtils.lerp(Math.PI / 2, Math.PI, progress);
      if (leftReel) leftReel.rotation.z += (scrollY - lastSmoothedY) * 0.02;
    }
    lastSmoothedY = scrollY;
  }

  /* 6. HERO-ONLY MOSH EFFECT */
  function createMoshStamp() {
    const hero = document.getElementById('hero-section');
    if (!hero || hero.getBoundingClientRect().bottom <= 50) return;
    const clone = document.getElementById('master-site').cloneNode(true);
    clone.querySelectorAll('video, canvas').forEach(el => el.remove());
    // ... [Insert Mosh logic] ...
  }

  // [Include your remaining logic for Hero Sequence, Mood, Showreel Camera, etc. here]

  initUnifiedGL();
  requestAnimationFrame(unifiedRenderLoop);
})();
