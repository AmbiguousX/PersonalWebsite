// js/animation.js

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { scene, camera, controls, loadingManager } from './setup.js';
import { initBillboards } from './billboards.js';

// Animation variables
let mixer;
let faceMixer;
let character;
let animations = {};
let currentAction = null;
let previousAction = null;
let isPlaying = true;
let nextAnimationTimeout = null;

// Ping-pong animation tracking
let isReversing = false;
let animTimeCheck = 0;
let currentAnimationDuration = 0;

// Face animation variables
let faceAction = null;
let hasFaceAnimation = false;

// Configuration
const FACE_ANIMATION_INDEX = 4; // Set to your face animation index
const CROSSFADE_DURATION = 0.5;
const MIN_ANIMATION_DURATION = 3000; // 3 seconds
const MAX_ANIMATION_DURATION = 6000; // 6 seconds

// Load the 3D model
export function loadModel(modelPath) {
    const loader = new GLTFLoader(loadingManager);

    loader.load(modelPath, (gltf) => {
        character = gltf.scene;
        character.updateMatrixWorld(true);

        // Enable shadows on the character model
        character.traverse(node => {
            if (node.isMesh) {
                node.castShadow = true;
                node.receiveShadow = true;

                // Ensure materials properly interact with shadows
                if (node.material) {
                    // If using MeshBasicMaterial, warn and consider upgrading
                    if (node.material.isMeshBasicMaterial) {
                        console.warn('MeshBasicMaterial found on model. This may not work well with shadows:', node.name);

                        // Optional: Automatically upgrade to StandardMaterial
                        // This preserves the original material properties
                        const newMaterial = new THREE.MeshStandardMaterial({
                            map: node.material.map,
                            color: node.material.color,
                            transparent: node.material.transparent,
                            opacity: node.material.opacity,
                            side: node.material.side,
                            roughness: 0.7,
                            metalness: 0.0
                        });
                        node.material = newMaterial;
                    }

                    // Ensure existing StandardMaterial has proper shadow properties
                    if (node.material.isMeshStandardMaterial) {
                        node.material.shadowSide = THREE.FrontSide;
                    }
                }
            }
        });

        // Calculate bounding box and position
        const box = new THREE.Box3().setFromObject(character);
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());

        // Position the model
        character.position.sub(center);
        scene.add(character);


        // Initialize billboards
        initBillboards(center, size);

        // Set up camera
        const maxDim = Math.max(size.x, size.y, size.z);
        const fov = camera.fov * (Math.PI / 180);
        const distance = Math.abs(maxDim / Math.tan(fov / 2));

        camera.position.set(0, center.y, distance);
        controls.target.copy(center);
        camera.lookAt(center);
        controls.update();
        camera.updateProjectionMatrix();

        // Set up animation system
        setupAnimations(gltf.animations);
    });
}

// Set up all animations from the loaded model
function setupAnimations(animationClips) {
    if (!animationClips || animationClips.length === 0) return;

    console.log(`Found ${animationClips.length} animation clips`);

    // Create mixers
    mixer = new THREE.AnimationMixer(character);
    faceMixer = new THREE.AnimationMixer(character);

    // Process animations
    animationClips.forEach((clip, index) => {
        // Separate face and body animations
        if (index === FACE_ANIMATION_INDEX) {
            // Handle face animation (morph targets)
            const morphTracks = clip.tracks.filter(track =>
                track.name.includes('.morphTargetInfluences')
            );

            if (morphTracks.length > 0) {
                const morphOnlyClip = new THREE.AnimationClip(
                    clip.name + '_MorphOnly',
                    clip.duration,
                    morphTracks
                );

                faceAction = faceMixer.clipAction(morphOnlyClip);
                faceAction.setLoop(THREE.LoopRepeat);
                faceAction.clampWhenFinished = false;
                faceAction.play();

                hasFaceAnimation = true;
                console.log(`Facial animation set up: ${clip.name}`);
            }
        } else {
            // Body animations
            const name = clip.name || `animation_${index}`;
            const action = mixer.clipAction(clip);

            action.setLoop(THREE.LoopRepeat);
            action.clampWhenFinished = false;

            animations[name] = action;
            console.log(`Body animation added: ${name}`);
        }
    });

    // Start with first non-face animation
    const bodyAnimationNames = Object.keys(animations);
    if (bodyAnimationNames.length > 0) {
        currentAction = animations[bodyAnimationNames[0]];
        currentAction.play();

        // Track initial animation duration
        currentAnimationDuration = currentAction.getClip().duration;

        // Begin random animation cycle
        scheduleNextAnimation();
    }
}

// Smoothly transition to a new animation with random start point
function fadeToAnimation(newAnimationName, duration = CROSSFADE_DURATION) {
    const newAction = animations[newAnimationName];

    if (!newAction) {
        console.warn(`Animation "${newAnimationName}" not found!`);
        return false;
    }

    // Reset ping-pong tracking
    isReversing = false;
    animTimeCheck = 0;

    // Store previous action for crossfading
    previousAction = currentAction;
    currentAction = newAction;

    // Update animation duration
    currentAnimationDuration = currentAction.getClip().duration;

    // Start at a random point in the animation (between 10% and 75% of the way through)
    // This avoids starting right at the end or beginning where animations often have less motion
    const randomStartPoint = currentAnimationDuration * (0.1 + Math.random() * 0.65);

    // Reset and prepare new action with random start time
    currentAction.reset();
    currentAction.time = randomStartPoint;
    currentAction.setEffectiveTimeScale(1);
    currentAction.setEffectiveWeight(1);

    // Crossfade if there's a previous action
    if (previousAction && previousAction !== currentAction) {
        currentAction.crossFadeFrom(previousAction, duration, true);
    }

    // Play the new action
    currentAction.play();

    return true;
}

// Schedule the next random animation change
function scheduleNextAnimation() {
    // Clear any existing timeout
    if (nextAnimationTimeout) {
        clearTimeout(nextAnimationTimeout);
    }

    // Get all animation names (excluding face animation)
    const availableAnimations = Object.keys(animations);

    if (availableAnimations.length === 0) return;

    // Calculate random duration and select random animation
    const duration = MIN_ANIMATION_DURATION +
        Math.random() * (MAX_ANIMATION_DURATION - MIN_ANIMATION_DURATION);

    nextAnimationTimeout = setTimeout(() => {
        // Pick a random animation different from current
        const currentAnimName = Object.keys(animations).find(
            name => animations[name] === currentAction
        );

        const otherAnimations = availableAnimations.filter(
            name => name !== currentAnimName
        );

        const nextAnimName = otherAnimations[
            Math.floor(Math.random() * otherAnimations.length)
        ];

        // Transition to new animation
        fadeToAnimation(nextAnimName);

        // Schedule next animation
        scheduleNextAnimation();
    }, duration);
}

// Update animation with delta time from main.js
export function updateAnimation(delta) {
    if (!isPlaying) return;

    // Update body mixer
    if (mixer) {
        mixer.update(delta);

        // Improved ping-pong animation logic
        if (currentAction) {
            // Get the current animation time directly from the action rather than tracking
            // This is more reliable especially when we're starting animations from random points
            const currentTime = currentAction.time;

            // Check if we need to reverse direction based on actual position in animation
            if (!isReversing && currentTime >= currentAnimationDuration * 0.9) {
                // Only log if we're actually changing direction to reduce console spam
                if (currentAction.timeScale > 0) {
                    console.log("Reversing animation direction (playing backward)");
                    currentAction.timeScale = -1;
                    isReversing = true;
                }
            }
            else if (isReversing && currentTime <= currentAnimationDuration * 0.1) {
                // Only log if we're actually changing direction to reduce console spam
                if (currentAction.timeScale < 0) {
                    console.log("Resuming forward playback");
                    currentAction.timeScale = 1;
                    isReversing = false;
                }
            }
        }
    }

    // Update face mixer (if exists)
    if (faceMixer) {
        faceMixer.update(delta);
    }
}

// Public API to manually trigger animations
export function playAnimation(name, crossfadeDuration = CROSSFADE_DURATION) {
    return fadeToAnimation(name, crossfadeDuration);
}

// Get list of all available animations
export function getAvailableAnimations() {
    return Object.keys(animations);
}

// Pause all animations
export function pauseAnimations() {
    isPlaying = false;
    if (nextAnimationTimeout) {
        clearTimeout(nextAnimationTimeout);
    }
}

// Resume animations
export function resumeAnimations() {
    isPlaying = true;
    scheduleNextAnimation();
}