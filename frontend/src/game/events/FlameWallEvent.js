import { WorldEvent } from "./WorldEvent.js";
import * as THREE from "three";

export class FlameWallEvent extends WorldEvent {
    /**
     * Creates an instance of FlameWallEvent.
     */
    constructor() {
        super();
        this.wallGroup = null;
        this.speed = 1.8;
        this.isGameOver = false;
        this.uiOverlay = null;
        this.particles = [];
        this.particleCount = 50;
    }

    /**
     * Initializes the flame wall event, creating 3D objects and aligning them behind the player.
     * @param {Object} worldPhase
     * @param {THREE.Scene} scene
     * @returns {Promise<void>}
     */
    async init(worldPhase, scene) {
        this.wallGroup = new THREE.Group();
        
        this.createBasePlane();
        this.createParticles();
        this.createFireLight();
        this.positionWallBehindPlayer(worldPhase);
        
        this.wallGroup.rotation.y = -Math.PI / 6;
        
        scene.add(this.wallGroup);
    }

    /**
     * Creates the base plane mesh for the fire wall.
     */
    createBasePlane() {
        const geometry = new THREE.PlaneGeometry(150, 40);
        const material = new THREE.MeshBasicMaterial({
            color: 0xff4400,
            transparent: true,
            opacity: 0.8,
            side: THREE.DoubleSide,
            blending: THREE.AdditiveBlending
        });
        const plane = new THREE.Mesh(geometry, material);
        plane.position.y = 20;
        this.wallGroup.add(plane);
    }

    /**
     * Creates particle meshes that simulate flames.
     */
    createParticles() {
        const particleGeo = new THREE.BoxGeometry(2, 4, 2);
        const particleMat = new THREE.MeshBasicMaterial({
            color: 0xffaa00,
            transparent: true,
            opacity: 0.9,
            blending: THREE.AdditiveBlending
        });

        for (let i = 0; i < this.particleCount; i++) {
            const particle = new THREE.Mesh(particleGeo, particleMat);
            this.randomizeParticlePosition(particle);
            particle.userData = this.generateParticleMetaData();
            this.particles.push(particle);
            this.wallGroup.add(particle);
        }
    }

    /**
     * Randomizes the position of a fire particle.
     * @param {THREE.Mesh} particle
     */
    randomizeParticlePosition(particle) {
        const xOffset = (Math.random() - 0.5) * 150;
        const yOffset = Math.random() * 20;
        const zOffset = (Math.random() - 0.5) * 5;
        particle.position.set(xOffset, yOffset, zOffset);
    }

    /**
     * Generates movement meta-data for a particle.
     * @returns {Object} Particle movement data
     */
    generateParticleMetaData() {
        return {
            speedY: 5 + Math.random() * 10,
            speedRot: (Math.random() - 0.5) * 5
        };
    }

    /**
     * Creates a light source to illuminate the environment.
     */
    createFireLight() {
        const fireLight = new THREE.PointLight(0xff5500, 2000, 150);
        fireLight.position.set(0, 10, 0);
        this.wallGroup.add(fireLight);
    }

    /**
     * Positions the wall group behind the player at the start of the event.
     * @param {Object} worldPhase
     */
    positionWallBehindPlayer(worldPhase) {
        if (!worldPhase.player || !worldPhase.player.mesh) return;

        const startXOffset = worldPhase.player.mesh.position.x - 12.5;
        const startZOffset = worldPhase.player.mesh.position.z + 25;

        this.wallGroup.position.set(startXOffset, 0, startZOffset);
    }

    /**
     * Updates the logic for the flame wall per frame.
     * @param {Object} worldPhase
     * @param {number} deltaTime
     */
    update(worldPhase, deltaTime) {
        if (!this.canUpdate(worldPhase)) return;

        this.wallGroup.translateZ(-this.speed * deltaTime);
        this.updateParticles(deltaTime);
        this.checkCollisionWithPlayer(worldPhase);
    }

    /**
     * Checks if the event can be updated safely.
     * @param {Object} worldPhase
     * @returns {boolean}
     */
    canUpdate(worldPhase) {
        return worldPhase.player && this.wallGroup && !this.isGameOver;
    }

    /**
     * Animates the fire particles.
     * @param {number} deltaTime
     */
    updateParticles(deltaTime) {
        this.particles.forEach(p => {
            p.position.y += p.userData.speedY * deltaTime;
            p.rotation.x += p.userData.speedRot * deltaTime;
            p.rotation.y += p.userData.speedRot * deltaTime;

            if (p.position.y > 40) {
                p.position.y = 0;
            }
        });
    }

    /**
     * Checks if the flame wall has overtaken the player's 3D position.
     * @param {Object} worldPhase
     */
    checkCollisionWithPlayer(worldPhase) {
        if (!worldPhase.player || !worldPhase.player.mesh) return;

        if (this.wallGroup.position.z < worldPhase.player.mesh.position.z && !this.isGameOver) {
            this.triggerGameOver(worldPhase);
        }
    }

    /**
     * Triggers the game over state and halts the event progression.
     * @param {Object} worldPhase
     */
    triggerGameOver(worldPhase) {
        this.isGameOver = true;
        this.displayGameOverOverlay();
    }

    /**
     * Displays the game over UI overlay.
     */
    displayGameOverOverlay() {
        this.uiOverlay = document.createElement("div");
        this.uiOverlay.classList.add("flame-wall-overlay");
        
        this.uiOverlay.innerHTML = `
            <h1 class="flame-wall-title">RÉDUIT EN CENDRES !</h1>
            <p class="flame-wall-subtitle">Appuyez sur R pour recommencer</p>
        `;
        
        document.body.appendChild(this.uiOverlay);
    }

    /**
     * Intercepts keydown inputs during the game over state.
     * @param {Object} worldPhase
     * @param {KeyboardEvent} event
     * @returns {boolean} True if the input is intercepted and blocked.
     */
    handleKeyDown(worldPhase, event) {
        if (this.isRestartRequested(event)) {
            worldPhase.gameEngine.loadLevel(worldPhase.gameEngine.currentLevel);
            return true;
        }
        
        return this.isGameOver;
    }

    /**
     * Validates if the player pressed the restart key.
     * @param {KeyboardEvent} event
     * @returns {boolean}
     */
    isRestartRequested(event) {
        return this.isGameOver && event.key.toUpperCase() === "R";
    }

    /**
     * Cleans up all 3D meshes and DOM elements used by the event.
     * @param {Object} worldPhase
     */
    cleanup(worldPhase) {
        this.cleanupWallGroup(worldPhase);
        this.cleanupUIOverlay();
    }

    /**
     * Cleans up and disposes the 3D meshes for the wall.
     * @param {Object} worldPhase
     */
    cleanupWallGroup(worldPhase) {
        if (!this.wallGroup) return;

        worldPhase.gameEngine.scene.remove(this.wallGroup);
        this.wallGroup.children.forEach(child => {
            if (child.geometry) child.geometry.dispose();
            if (child.material) child.material.dispose();
        });
        this.wallGroup = null;
    }

    /**
     * Cleans up the DOM elements for the UI.
     */
    cleanupUIOverlay() {
        if (!this.uiOverlay) return;

        this.uiOverlay.remove();
        this.uiOverlay = null;
    }
}
