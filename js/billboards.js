import * as THREE from 'three';
import { camera, scene } from './setup.js';

// Simplified Billboard data with direct URLs
const billboardButtons = [
    { text: 'Ambiguous', url: 'https://www.instagram.com/ambig_art/' },
    { text: 'Portfolio', url: 'https://manifold.gallery/noah' },
    { text: 'Music', url: 'https://open.spotify.com/artist/3MvKEZQDRekYz5G9UBldff?si=B5c-uHGARW2HEBpjVJovew' }
];

// Global references
export const billboardMeshes = [];
export let headPosition = new THREE.Vector3(0, 0, 0);
export let modelSize = new THREE.Vector3(1, 1, 1);

const IS_MOBILE = window.innerWidth < 768;

// Cache for textures to avoid recreating them
const textureCache = new Map();

// Create and initialize billboards
export function initBillboards(position, size) {
    // Store model information for billboards
    headPosition = new THREE.Vector3(0, size.y / 2 + 0.5, 0);
    modelSize = size;

    // Create billboards
    billboardButtons.forEach((button, index) => {
        const offset = (index - (billboardButtons.length - 1) / 2) * 1.2;
        const position = new THREE.Vector3(
            headPosition.x + offset,
            headPosition.y + 0.5,
            headPosition.z
        );

        const billboard = createBillboard(button.text, position);
        scene.add(billboard);
        billboardMeshes.push(billboard);
    });

    // Position billboards correctly for current screen size
    resizeBillboards();

    // Listen for resize events
    window.addEventListener('app-resized', resizeBillboards);

    // Add click handling for both mouse and touch
    window.addEventListener('click', handleBillboardClick);
    window.addEventListener('touchend', handleBillboardTouch, { passive: false });
}

// Create a single billboard
function createBillboard(text, position) {
    // Check if we already have this texture cached
    if (!textureCache.has(text)) {
        // Create canvas for text
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = 256;
        canvas.height = 128;

        // Clear canvas
        context.clearRect(0, 0, canvas.width, canvas.height);

        // Define corner radius
        const cornerRadius = 20; // Adjust this value to control roundness

        // Create rounded rectangle path
        roundedRect(context, 0, 0, canvas.width, canvas.height, cornerRadius);

        // Background fill with rounded corners
        context.fillStyle = 'rgb(38, 111, 255)';
        context.fill();

        // Text
        context.font = 'bold 42px Arial';
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillStyle = 'white';
        context.fillText(text, canvas.width / 2, canvas.height / 2);

        // Create texture and cache it
        const texture = new THREE.CanvasTexture(canvas);
        texture.needsUpdate = true;
        texture.minFilter = THREE.LinearFilter;
        texture.generateMipmaps = false; // Save memory
        textureCache.set(text, texture);
    }

    // Get texture from cache
    const texture = textureCache.get(text);

    // Create material with the texture
    const material = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        side: THREE.DoubleSide,
        depthWrite: false // Helps with transparency sorting
    });

    // Create plane geometry
    const geometry = new THREE.PlaneGeometry(1, 0.5);

    // Create mesh
    const billboard = new THREE.Mesh(geometry, material);
    billboard.position.copy(position);

    // Optimize rendering
    billboard.frustumCulled = true;
    billboard.matrixAutoUpdate = true;

    // Store button data in user data
    billboard.userData.buttonData = billboardButtons.find(btn => btn.text === text);

    return billboard;
}

// Helper function to draw rounded rectangles
function roundedRect(ctx, x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
}

// Handle billboard clicks with mouse
function handleBillboardClick(event) {
    // Raycaster to detect billboard clicks
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2(
        (event.clientX / window.innerWidth) * 2 - 1,
        -(event.clientY / window.innerHeight) * 2 + 1
    );

    // Update the picking ray with the camera and mouse position
    raycaster.setFromCamera(mouse, camera);

    // Check intersection with billboards
    const intersects = raycaster.intersectObjects(billboardMeshes);

    if (intersects.length > 0) {
        const clickedMesh = intersects[0].object;

        // Open URL if available
        if (clickedMesh.userData.buttonData && clickedMesh.userData.buttonData.url) {
            window.open(clickedMesh.userData.buttonData.url, '_blank');
        }
    }
}

// Handle billboard touches on mobile
function handleBillboardTouch(event) {
    // Prevent default to avoid double-firing with click events
    event.preventDefault();

    if (event.changedTouches.length === 0) return;

    // Get the first touch
    const touch = event.changedTouches[0];

    // Create a raycaster
    const raycaster = new THREE.Raycaster();
    const touchPosition = new THREE.Vector2(
        (touch.clientX / window.innerWidth) * 2 - 1,
        -(touch.clientY / window.innerHeight) * 2 + 1
    );

    // Update the raycaster
    raycaster.setFromCamera(touchPosition, camera);

    // Check for intersections
    const intersects = raycaster.intersectObjects(billboardMeshes);

    if (intersects.length > 0) {
        const touchedMesh = intersects[0].object;

        // Open URL if available
        if (touchedMesh.userData.buttonData && touchedMesh.userData.buttonData.url) {
            window.open(touchedMesh.userData.buttonData.url, '_blank');
        }
    }
}

// Update billboard orientation to face camera - optimized version
const tempMatrix = new THREE.Matrix4();
const tempPosition = new THREE.Vector3();

export function updateBillboards() {
    tempPosition.copy(camera.position);

    // Update billboards
    billboardMeshes.forEach(billboard => {
        if (billboard.visible) {
            billboard.lookAt(tempPosition);
        }
    });
}

// Resize and reposition billboards
export function resizeBillboards() {
    // Determine if mobile and calculate scale factor
    const isMobile = window.innerWidth < 568;

    // Use a larger scale for mobile
    const baseFactor = isMobile ? 1.8 : 1.0;  // Increased mobile size by 80%
    const scaleFactor = baseFactor * Math.min(1, window.innerWidth / 1000);

    // Apply scale to all billboards
    billboardMeshes.forEach(billboard => {
        billboard.scale.set(scaleFactor, scaleFactor, 1);
    });

    // Position billboards - vertically on mobile, horizontally on desktop
    billboardButtons.forEach((button, index) => {
        if (billboardMeshes[index]) {
            if (isMobile) {
                // Stack vertically on mobile with increased spacing
                const verticalSpacing = 0.9 * scaleFactor;  // Increased spacing
                const verticalOffset = (index - (billboardButtons.length - 1) / 2) * verticalSpacing;

                billboardMeshes[index].position.set(
                    0,
                    headPosition.y + 0.7 - verticalOffset,  // Higher starting position
                    headPosition.z + 0.2  // Bring slightly forward
                );
            } else {
                // Arrange horizontally on desktop
                const horizontalSpacing = 1.2 * Math.min(1.2, window.innerWidth / 1000);
                const horizontalOffset = (index - (billboardButtons.length - 1) / 2) * horizontalSpacing;

                billboardMeshes[index].position.set(
                    headPosition.x + horizontalOffset,
                    headPosition.y + 0.5,
                    headPosition.z
                );
            }

            // Ensure billboards face the camera
            billboardMeshes[index].lookAt(camera.position);
        }
    });
}