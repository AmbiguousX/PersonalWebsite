import * as THREE from 'three';
import { camera } from './setup.js';
import { billboardMeshes } from './billboards.js';

// Raycaster for interaction
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

// Set up all event listeners
export function setupEventListeners() {
    window.addEventListener('click', onPointerClick);
    window.addEventListener('mousemove', onPointerMove);
    window.addEventListener('touchstart', onTouchStart, { passive: false });
}

// Handle mouse clicks
function onPointerClick(event) {
    pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
    pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;

    checkIntersection(true);
}

// Handle mouse movements
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

    checkIntersection(true);
}

// Check for intersections with billboards
function checkIntersection(isClick) {
    raycaster.setFromCamera(pointer, camera);
    const intersects = raycaster.intersectObjects(billboardMeshes);

    if (intersects.length > 0) {
        if (isClick) {
            const url = intersects[0].object.userData.url;
            window.open(url, '_blank');
        }
        document.body.style.cursor = 'pointer';
        return true;
    } else {
        document.body.style.cursor = 'default';
        return false;
    }
}