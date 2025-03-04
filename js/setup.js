import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// Export these for use in other modules
export const scene = new THREE.Scene();
export const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.01, 10000);
export let renderer;
export let controls;
export const clock = new THREE.Clock();

// Device detection
export const IS_MOBILE = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth < 768;
export const IS_IOS = ['iPad Simulator', 'iPhone Simulator', 'iPod Simulator', 'iPad', 'iPhone', 'iPod'].includes(navigator.platform)
    || (navigator.userAgent.includes('Mac') && 'ontouchend' in document);

// Loading manager
export const loadingManager = new THREE.LoadingManager();
const loadingScreen = document.getElementById('loading-screen');
const progressBar = document.querySelector('.progress-bar');

// Initialize scene, camera, renderer, and controls
export function initScene() {
    // Configure loading manager
    loadingManager.onProgress = (url, loaded, total) => {
        const progress = (loaded / total) * 100;
        progressBar.style.width = progress + '%';
    };

    loadingManager.onLoad = () => {
        loadingScreen.style.display = 'none';
    };

    loadingManager.onError = (url) => {
        console.error('Error loading:', url);
    };

    // Set up renderer with shadow support
    renderer = new THREE.WebGLRenderer({
        antialias: !IS_IOS,
        powerPreference: 'high-performance'
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, IS_IOS ? 2 : 3));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;

    // Enable shadow rendering
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap; // Soft shadows

    document.body.appendChild(renderer.domElement);

    // Set up controls
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = .05;
    camera.position.z = 5;

    // Add lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.3); // Reduced for visible shadows

    // Main directional light with shadows
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.5);
    directionalLight.position.set(5, 5, 5);
    directionalLight.target.position.set(0, 0, 0);

    // Configure shadow properties
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = IS_MOBILE ? 1024 : 2048;
    directionalLight.shadow.mapSize.height = IS_MOBILE ? 1024 : 2048;
    directionalLight.shadow.camera.near = 0.1;
    directionalLight.shadow.camera.far = 20;
    directionalLight.shadow.camera.left = -7;
    directionalLight.shadow.camera.right = 7;
    directionalLight.shadow.camera.top = 7;
    directionalLight.shadow.camera.bottom = -7;
    directionalLight.shadow.bias = -0.001;

    scene.add(ambientLight, directionalLight);

    // Load background
    const textureLoader = new THREE.TextureLoader(loadingManager);
    textureLoader.load('./snow.webp', (texture) => {
        texture.mapping = THREE.EquirectangularReflectionMapping;
        scene.background = texture;
        scene.environment = texture;
    });

    // Start the clock
    clock.start();

    // Handle window resize
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);

        // Signal that resize happened (for other modules)
        window.dispatchEvent(new CustomEvent('app-resized'));
    });
}

// Helper function to enable shadows on objects
export function enableShadows(object, cast = true, receive = true) {
    if (!object) return;

    object.traverse(child => {
        if (child.isMesh) {
            // Enable shadow casting and receiving
            child.castShadow = cast;
            child.receiveShadow = receive;

            // Ensure the material can work with shadows
            if (child.material && child.material.isMeshBasicMaterial && (cast || receive)) {
                console.warn('MeshBasicMaterial does not work well with shadows. Consider using MeshStandardMaterial for object:', child);
            }
        }
    });
}


