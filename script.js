
/* SHADERS (Unchanged) */
// ... (Your original shader logic goes here)

/* PRODUCT PROPS LOGIC */
let scene, camera, renderer;

function initProductProps() {
    const container = document.getElementById('three-prop-container');
    if(!container) return;

    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 1000);
    renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    container.appendChild(renderer.domElement);

    const loader = new THREE.GLTFLoader();
    
    // Load Enlarger
    loader.load('durst_enlarger_darkroom_asset.glb', (gltf) => {
        gltf.scene.scale.set(5, 5, 5);
        gltf.scene.position.set(10, -5, -5);
        scene.add(gltf.scene);
    });

    // Load Tray
    loader.load('seeding_germination_watering_tray.glb', (gltf) => {
        gltf.scene.scale.set(15, 1, 15);
        gltf.scene.position.y = -12;
        scene.add(gltf.scene);
    });

    camera.position.z = 12;
    animate();
}

function animate() {
    requestAnimationFrame(animate);
    const scrollY = window.scrollY;
    camera.position.y = -scrollY * 0.005; 
    renderer.render(scene, camera);
}

window.addEventListener('load', initProductProps);
