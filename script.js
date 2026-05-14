
// --- YOUR ORIGINAL LANDING/FASHION LOGIC ---
// (Placeholder for your existing GLSL/Scroll scripts)

// --- NEW PRODUCT GALLERY PROP LOGIC ---
let propScene, propCamera, propRenderer;

function initProps() {
    const container = document.getElementById('prop-canvas-container');
    if(!container) return;

    propScene = new THREE.Scene();
    propCamera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    propRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    propRenderer.setSize(window.innerWidth, window.innerHeight);
    container.appendChild(propRenderer.domElement);

    const light = new THREE.DirectionalLight(0xffffff, 1);
    light.position.set(5, 5, 5);
    propScene.add(light);
    propScene.add(new THREE.AmbientLight(0xffffff, 0.5));

    propCamera.position.z = 10;

    const loader = new THREE.GLTFLoader();

    // The Enlarger Prop (Anchor)
    loader.load('durst_enlarger_darkroom_asset.glb', (gltf) => {
        const enlarger = gltf.scene;
        enlarger.scale.set(5, 5, 5);
        enlarger.position.set(8, -5, -5); 
        propScene.add(enlarger);
    });

    // The Tray Prop (Liquid Effect)
    loader.load('seeding_germination_watering_tray.glb', (gltf) => {
        const tray = gltf.scene;
        tray.scale.set(15, 1, 15);
        tray.position.y = -15; // Set deep behind product section
        propScene.add(tray);
    });

    animateProps();
}

function animateProps() {
    requestAnimationFrame(animateProps);
    // Add scroll-based parallax here to move props behind product gallery
    const scrollY = window.scrollY;
    propCamera.position.y = -scrollY * 0.005; 
    propRenderer.render(propScene, propCamera);
}

window.addEventListener('load', initProps);
