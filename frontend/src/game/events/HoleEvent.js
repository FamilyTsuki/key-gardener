import { WorldEvent } from "./WorldEvent.js";
import * as THREE from "three";

/**
 * Event for handling interaction with a hole in the world phase.
 */
export class HoleEvent extends WorldEvent {
    /**
     * Creates an instance of HoleEvent.
     */
    constructor() {
        super();
        this.holeSequenceIndex = 0;
        this.enterPromptOverlay = null;
        this.uiOverlay = null;
        this.holeTileId = null;
        this.holeMesh = null;
    }

    /**
     * Mutates the map layout to create the hole by hiding the mesh.
     * @param {Array} mapLayout - The raw map layout array.
     */
    modifyLayout(mapLayout) {
        if (!mapLayout || mapLayout.length === 0) return;

        const targetRow = mapLayout.filter((t) => t.y === -34);
        
        if (targetRow.length > 0) {
            targetRow.sort((a, b) => a.x - b.x);
            const centerTile = targetRow[Math.floor(targetRow.length / 2)];
            if (centerTile) {
                this.holeTileId = centerTile.id;
                centerTile.renderMesh = false;
            }
        }
    }

    /**
     * Initializes the hole event.
     * @param {WorldPhase} worldPhase - The world phase instance.
     * @param {THREE.Scene} scene - The scene instance.
     * @returns {Promise<void>}
     */
    async init(worldPhase, scene) {
        if (!worldPhase.worldMap || !this.holeTileId) return;

        const holeTile = worldPhase.worldMap.mapLayout.find((t) => t.id === this.holeTileId);
        if (holeTile) {
            const holeGeo = new THREE.CylinderGeometry(1.3, 1.3, 15, 32);
            const holeMat = new THREE.MeshBasicMaterial({ color: 0x050508 });
            const holeMesh = new THREE.Mesh(holeGeo, holeMat);
            holeMesh.position.set(holeTile.x, (holeTile.baseY || 0) - 7.5, holeTile.y);
            scene.add(holeMesh);
            this.holeMesh = holeMesh;
            this.sceneRef = scene;
        }
    }

    /**
     * Updates the state of the hole event, checking player proximity.
     * @param {WorldPhase} worldPhase - The world phase instance.
     * @param {number} deltaTime - Time elapsed since last frame.
     */
    update(worldPhase, deltaTime) {
        if (!worldPhase.player || !worldPhase.worldMap || !this.holeTileId) return;

        const holeTile = worldPhase.worldMap.mapLayout.find(
            (t) => t.id === this.holeTileId
        );
        if (holeTile) {
            const dx = holeTile.rawPosition.x - worldPhase.player.x;
            const dy = holeTile.rawPosition.y - worldPhase.player.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < 1.5 && !worldPhase.isTransitioning) {
                this.showEnterPrompt(worldPhase);
            } else {
                this.hideEnterPrompt(worldPhase);
            }
        }
    }

    /**
     * Handles keyboard input during the hole interaction.
     * @param {WorldPhase} worldPhase - The world phase instance.
     * @param {KeyboardEvent} event - The keyboard event.
     * @returns {boolean} True if the event was intercepted, false otherwise.
     */
    handleKeyDown(worldPhase, event) {
        if (worldPhase.isTransitioning) return false;

        const keyName = event.key.toUpperCase();
        if (keyName === "ENTER") {
            const holeTile = worldPhase.worldMap.mapLayout.find(
                (t) => t.id === this.holeTileId
            );
            if (holeTile) {
                const dx = holeTile.rawPosition.x - worldPhase.player.x;
                const dy = holeTile.rawPosition.y - worldPhase.player.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < 1.5) {
                    worldPhase.isTransitioning = true;
                    
                    if (this.enterPromptOverlay) {
                        const keyElement = this.enterPromptOverlay.querySelector('.enter-prompt-key');
                        if (keyElement) keyElement.classList.add("active");
                    }
                    
                    setTimeout(() => {
                        this.hideEnterPrompt(worldPhase);
                        this.animateFall(worldPhase.player, holeTile).then(() => {
                            worldPhase.gameEngine.nextLevel();
                        });
                    }, 150);
                    
                    return true;
                }
            }
        }
        return false;
    }

    /**
     * Animates the player falling into the hole.
     * @param {Player} player - The player to animate.
     * @returns {Promise<void>} Resolves when the animation completes.
     */
    animateFall(player, holeTile) {
        return new Promise((resolve) => {
            if (!player || !player.mesh) {
                resolve();
                return;
            }

            const startY = player.offsetY;
            const startX = player.x;
            const startGridY = player.y;
            const targetX = holeTile ? holeTile.rawPosition.x : startX;
            const targetGridY = holeTile ? holeTile.rawPosition.y : startGridY;
            
            const duration = 1200;
            const startTime = performance.now();

            const fall = (time) => {
                const elapsed = time - startTime;
                const progress = Math.min(elapsed / duration, 1);
                
                player.x = startX + (targetX - startX) * progress;
                player.y = startGridY + (targetGridY - startGridY) * progress;
                
                const yOffset = Math.sin(progress * Math.PI) * 3.0 - Math.pow(progress, 3) * 15.0;
                player.offsetY = startY + yOffset;
                
                const scale = Math.max(0, 1 - Math.pow(progress, 2));
                player.mesh.scale.setScalar(scale);

                if (progress < 1) {
                    requestAnimationFrame(fall);
                } else {
                    resolve();
                }
            };
            requestAnimationFrame(fall);
        });
    }

    /**
     * Cleans up the UI overlay and timeouts.
     * @param {WorldPhase} worldPhase - The world phase instance.
     */
    cleanup(worldPhase) {
        if (this.uiOverlay) {
            this.uiOverlay.remove();
            this.uiOverlay = null;
        }
        if (this.enterPromptOverlay) {
            this.enterPromptOverlay.remove();
            this.enterPromptOverlay = null;
        }

        if (this.holeMesh && this.sceneRef) {
            if (this.holeMesh.geometry) this.holeMesh.geometry.dispose();
            if (this.holeMesh.material) this.holeMesh.material.dispose();
            this.sceneRef.remove(this.holeMesh);
            this.holeMesh = null;
        }
    }




    /**
     * Shows a prompt indicating the player can enter the portal.
     * @param {WorldPhase} worldPhase - The world phase instance.
     */
    showEnterPrompt(worldPhase) {
        if (this.enterPromptOverlay) return;

        this.enterPromptOverlay = document.createElement("div");
        this.enterPromptOverlay.classList.add(
            "door-mini-game-overlay",
            "enter-prompt-overlay"
        );

        const enterKey = document.createElement("div");
        enterKey.classList.add("enter-prompt-key");
        enterKey.innerHTML = `
            <svg width="40" height="30" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="9 10 4 15 9 20"></polyline>
                <path d="M20 4v7a4 4 0 0 1-4 4H4"></path>
            </svg>
        `;

        const titleDiv = document.createElement("div");
        titleDiv.classList.add("enter-prompt-title");
        titleDiv.innerText = "Sauter dans le trou";

        this.enterPromptOverlay.appendChild(titleDiv);
        this.enterPromptOverlay.appendChild(enterKey);

        document.body.appendChild(this.enterPromptOverlay);
    }

    /**
     * Hides the enter prompt.
     * @param {WorldPhase} worldPhase - The world phase instance.
     */
    hideEnterPrompt(worldPhase) {
        if (this.enterPromptOverlay) {
            this.enterPromptOverlay.remove();
            this.enterPromptOverlay = null;
        }
    }
}
