import { initScene, scene, camera, renderer, clock, controls } from './setup.js';
import { loadModel, updateAnimation } from './animation.js';
import { setupEventListeners } from './controls.js';
import { updateBillboards } from './billboards.js';

// Initialize everything
initScene();
setupEventListeners();
loadModel('./noahanims.glb'); // Replace with your model path

// Main animation loop
function animate() {
    requestAnimationFrame(animate);

    // Get delta time ONCE per frame
    const delta = clock.getDelta();

    updateBillboards();

    // Update controls first
    controls.update();

    // Update animation with the same delta
    if (typeof updateAnimation === 'function') {
        updateAnimation(delta);
    }

    // Render scene
    renderer.render(scene, camera);
}

// Start the animation loop
animate();