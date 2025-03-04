import * as THREE from 'three';
import { camera } from './setup.js';
import { billboardMeshes } from './billboards.js';

// Raycaster for interaction
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

// Set up all event listeners
export function setupEventListeners() {
    // We're removing this click listener as it conflicts with the one in billboards.js
    // window.addEventListener('click', onPointerClick);
    window.addEventListener('mousemove', onPointerMove);
    window.addEventListener('touchstart', onTouchStart, { passive: false });
}

// Handle mouse movements for cursor changes
function onPointerMove(event) {
    pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
    pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;

    checkIntersection(false);
}

// Handle touch events
function onTouchStart(event) {
    event.preventDefault();

    const touch = event.touches[0];
    pointer.x = (touch.clientX / window.innerWidth) * 2 - 1;
    pointer.y = -(touch.clientY / window.innerHeight) * 2 + 1;

    // We'll let billboards.js handle the actual click/touch
    checkIntersection(false);
}

// Check for intersections with billboards (for hover effects only)
function checkIntersection(isClick) {
    raycaster.setFromCamera(pointer, camera);
    const intersects = raycaster.intersectObjects(billboardMeshes);

    if (intersects.length > 0) {
        // Change cursor to pointer when hovering over billboard
        document.body.style.cursor = 'pointer';
        return true;
    } else {
        document.body.style.cursor = 'default';
        return false;
    }
}