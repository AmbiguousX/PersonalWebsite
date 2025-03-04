import * as THREE from 'three';
import { scene, camera, IS_MOBILE } from './setup.js';

// Updated Billboard data with dropdown options
const billboardButtons = [
    {
        text: 'Ambiguous',
        url: 'https://github.com',
        dropdown: [
            { text: 'Repositories', action: 'openRepos' },
            { text: 'Gists', action: 'openGists' },
            { text: 'Contributions', action: 'openContributions' },
            { text: 'Profile', action: 'openProfile' }
        ]
    },
    { text: 'Portfolio', url: 'https://linkedin.com' },
    { text: 'Music', url: 'https://manifold.gallery/noah' }
];

// Global references
export const billboardMeshes = [];
export let headPosition = new THREE.Vector3(0, 0, 0);
export let modelSize = new THREE.Vector3(1, 1, 1);

// Dropdown-specific variables
let dropdownMeshes = [];
let activeDropdown = null;

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

    // Add click handling
    window.addEventListener('click', handleBillboardClick);
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
        context.fillStyle = 'rgba(0, 0, 0, 0.7)';
        context.fill();

        // Text
        context.font = 'bold 48px Arial';
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

// Create dropdown menu for GitHub
function createDropdownMenu(gitHubBillboard) {
    // Clear any existing dropdown
    clearDropdown();

    const dropdownOptions = gitHubBillboard.userData.buttonData.dropdown;

    // Calculate dropdown position
    const basePosition = gitHubBillboard.position.clone();

    // Create dropdown meshes
    dropdownOptions.forEach((option, index) => {
        const dropdownCanvas = document.createElement('canvas');
        const context = dropdownCanvas.getContext('2d');
        dropdownCanvas.width = 256;
        dropdownCanvas.height = 128;

        // Clear canvas
        context.clearRect(0, 0, dropdownCanvas.width, dropdownCanvas.height);

        // Define corner radius
        const cornerRadius = 20; // Adjust this value to control roundness

        // Create rounded rectangle path
        roundedRect(context, 0, 0, dropdownCanvas.width, dropdownCanvas.height, cornerRadius);

        // Background fill with rounded corners
        context.fillStyle = 'rgba(50, 50, 50, 0.8)';
        context.fill();

        // Add a border if desired (also with rounded corners)
        context.strokeStyle = 'lightgray';
        context.lineWidth = 2;
        context.stroke();

        // Text
        context.font = 'bold 6px Arial';
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillStyle = 'white';
        context.fillText(option.text, dropdownCanvas.width / 2, dropdownCanvas.height / 2);

        // Create texture
        const texture = new THREE.CanvasTexture(dropdownCanvas);
        texture.needsUpdate = true;
        texture.minFilter = THREE.LinearFilter;
        texture.generateMipmaps = false;

        // Create material
        const material = new THREE.MeshBasicMaterial({
            map: texture,
            transparent: true,
            side: THREE.DoubleSide,
            depthWrite: false
        });

        // Create mesh
        const dropdownMesh = new THREE.Mesh(
            new THREE.PlaneGeometry(1, 0.5),
            material
        );

        // Position dropdown items vertically below the GitHub billboard
        dropdownMesh.position.set(
            basePosition.x,
            basePosition.y - 0.6 - (index * 0.6),
            basePosition.z
        );

        // Store action in user data
        dropdownMesh.userData.action = option.action;

        // Add to scene and tracking array
        scene.add(dropdownMesh);
        dropdownMeshes.push(dropdownMesh);
    });

    // Set active dropdown
    activeDropdown = dropdownOptions;
}

// Clear dropdown menu
function clearDropdown() {
    // Remove dropdown meshes from scene
    dropdownMeshes.forEach(mesh => {
        scene.remove(mesh);
    });
    // Clear the array
    dropdownMeshes = [];
    activeDropdown = null;
}

// Handle billboard clicks
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
    const intersects = raycaster.intersectObjects([...billboardMeshes, ...dropdownMeshes]);

    if (intersects.length > 0) {
        const clickedMesh = intersects[0].object;

        // Handle billboard with dropdown click
        if (clickedMesh.userData.buttonData &&
            clickedMesh.userData.buttonData.dropdown) {
            // Toggle dropdown
            if (activeDropdown) {
                clearDropdown();
            } else {
                createDropdownMenu(clickedMesh);
            }
        }
        // Handle dropdown item click
        else if (clickedMesh.userData.action) {
            // Perform the associated action
            handleDropdownAction(clickedMesh.userData.action);
            // Close dropdown after action
            clearDropdown();
        }
    } else if (activeDropdown) {
        // Close dropdown if clicked outside
        clearDropdown();
    }
}

// Handle dropdown actions
function handleDropdownAction(action) {
    console.log(`Executing action: ${action}`);
    // Add specific logic for each action
    switch (action) {
        case 'openRepos':
            console.log('Opening repositories...');
            break;
        case 'openGists':
            console.log('Opening gists...');
            break;
        case 'openContributions':
            console.log('Showing contributions...');
            break;
        case 'openProfile':
            console.log('Viewing profile...');
            break;
        default:
            console.log('Unknown action');
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

    // Update dropdown meshes if they exist
    dropdownMeshes.forEach(dropdownMesh => {
        if (dropdownMesh.visible) {
            dropdownMesh.lookAt(tempPosition);
        }
    });
}

// Resize and reposition billboards
export function resizeBillboards() {
    // Determine if mobile and calculate scale factor
    const isMobile = window.innerWidth < 768;
    const scaleFactor = Math.min(1, window.innerWidth / 1000);

    // Apply scale to all billboards
    billboardMeshes.forEach(billboard => {
        billboard.scale.set(scaleFactor, scaleFactor, 1);
    });

    // Apply scale to dropdown meshes
    dropdownMeshes.forEach(dropdownMesh => {
        dropdownMesh.scale.set(scaleFactor, scaleFactor, 1);
    });

    // Position billboards - vertically on mobile, horizontally on desktop
    billboardButtons.forEach((button, index) => {
        if (billboardMeshes[index]) {
            if (isMobile) {
                // Stack vertically on mobile
                const verticalSpacing = 0.7 * scaleFactor;
                const verticalOffset = (index - (billboardButtons.length - 1) / 2) * verticalSpacing;

                billboardMeshes[index].position.set(
                    0,
                    headPosition.y + 0.5 - verticalOffset,
                    headPosition.z
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