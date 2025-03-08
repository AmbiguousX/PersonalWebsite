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
// No longer need progress bar reference since we're using a spinner

// Function to calculate optimal camera distance based on screen size
function calculateCameraDistance() {
    // Base values
    const baseWidth = 1920;  // Reference width
    const baseDistance = 5;  // Reference distance
    const minDistance = 2.5; // Minimum distance (for small screens)
    const maxDistance = 5.5; // Maximum distance (for very large screens)

    // Calculate proportional distance
    const currentWidth = window.innerWidth;
    const scaleFactor = Math.min(1, currentWidth / baseWidth);

    // Scale distance between min and max based on screen width
    return Math.max(minDistance, Math.min(maxDistance, baseDistance * scaleFactor + 0.5));
}

// Initialize scene, camera, renderer, and controls
export function initScene() {
    // Configure loading manager
    loadingManager.onProgress = (url, loaded, total) => {
        // With a spinner, we don't need to update progress percentage
        // The spinner animation runs continuously
    };

    loadingManager.onLoad = () => {
        loadingScreen.style.display = 'none';
    };

    loadingManager.onError = (url) => {
        console.error('Error loading:', url);
        // Show error message immediately when an error occurs
        const errorMessage = document.querySelector('.error-message');
        if (errorMessage) {
            errorMessage.style.display = 'block';
        }
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

    // Set camera position based on screen size
    const distance = calculateCameraDistance();
    camera.position.z = distance;

    // Adjust control limits based on calculated distance
    controls.minDistance = distance * 0.6;  // Allow some zoom in
    controls.maxDistance = distance * 1.5;  // Allow some zoom out

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

        // Recalculate camera distance on resize
        const newDistance = calculateCameraDistance();
        camera.position.z = newDistance;

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