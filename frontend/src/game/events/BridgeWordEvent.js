import { WorldEvent } from "./WorldEvent.js";
import * as THREE from "three";

/**
 * Event for the bridge building typing challenge.
 */
export class BridgeWordEvent extends WorldEvent {
    /**
     * Creates an instance of BridgeWordEvent.
     */
    constructor(gameEngine, scenarioType) {
        super(gameEngine);
        this.scenarioType = scenarioType;
        this.isActive = false;
        this.isCompleted = false;
        
        // Words related to construction
        const words = [
            "PONT", "BOIS", "CORDE", "CLOU", "POUTRE", "PLANCHE", "PIERRE", "MARTEAU", "SCIE", 
            "FER", "ACIER", "BETON", "PILIER", "ARCHE", "FONDATION", "CABLE", "RIVET", "POULIE", 
            "TENDEUR", "CHAINE", "CIMENT", "SABLE", "GRAVIER", "BRIQUE", "MOELLON", "CHARPENTE"
        ];
        
        this.targetCompletedCount = 5; // We only need 5 words to finish
        this.completedCount = 0;
        this.wordStates = [];

        // Pick 20 words for the cloud
        const shuffled = words.sort(() => 0.5 - Math.random());
        for (let i = 0; i < 20; i++) {
            this.wordStates.push({ word: shuffled[i], completed: false });
        }
        this.totalWords = this.wordStates.length;
        this.completedCount = 0;
        this.currentTyped = "";
        
        this.startCameraPos = new THREE.Vector3();
        this.targetCameraPos = new THREE.Vector3();
        this.startCameraLookAt = new THREE.Vector3();
        this.targetCameraLookAt = new THREE.Vector3();
        
        this.transitionProgress = 0;
        this.transitioningToEvent = false;
        this.transitioningToWorld = false;
        
        this.uiOverlay = null;
        this.wordDisplay = null;
        
        this.triggerX = 0;
        this.triggerY = 0;
        this.bridgeMeshes = [];
        this.animatingTiles = [];
    }

    /**
     * Initializes the event.
     * @param {WorldPhase} worldPhase
     * @param {THREE.Scene} scene
     */
    async init(worldPhase, scene) {}

    /**
     * Updates the state of the event.
     * @param {WorldPhase} worldPhase
     * @param {number} deltaTime
     */
    update(worldPhase, deltaTime) {
        if (!worldPhase.player || !worldPhase.worldMap) return;

        // Continuously animate purple magic particles
        for (const mesh of this.bridgeMeshes) {
            if (mesh.type !== "Group") continue;
            const points = mesh.children.find(c => c.type === "Points");
            if (points) {
                const positions = points.geometry.attributes.position.array;
                for (let p = 1; p < positions.length; p += 3) {
                    positions[p] += deltaTime * 1.0; // Float upwards
                    if (positions[p] > 0.0) {
                        positions[p] = -2.0;
                    }
                }
                points.geometry.attributes.position.needsUpdate = true;
            }
        }

        if (this.isCompleted) return;

        if (this.transitioningToEvent) {
            this.handleCameraTransition(worldPhase, deltaTime, true);
            return;
        }
        
        if (this.transitioningToWorld) {
            this.handleCameraTransition(worldPhase, deltaTime, false);
            return;
        }

        if (this.isActive) {
            // Keep camera steady during the event
            worldPhase.camera.position.copy(this.eventCameraPos);
            worldPhase.camera.lookAt(this.eventCameraLookAt);
            
            // Animate rising tiles
            if (this.animatingTiles.length > 0) {
                const speed = 15.0; // Fast rise to keep pace with typing
                for (let i = this.animatingTiles.length - 1; i >= 0; i--) {
                    const anim = this.animatingTiles[i];
                    anim.mesh.position.y += speed * deltaTime;
                    if (anim.mesh.position.y >= anim.targetY) {
                        anim.mesh.position.y = anim.targetY;
                        this.animatingTiles.splice(i, 1);
                        
                        // Move player when center tile fully rises
                        if (anim.isCenter && anim.worldPhase) {
                            anim.worldPhase.player.move({ 
                                x: anim.tile.rawPosition.x, 
                                y: anim.tile.rawPosition.y,
                                offsetY: 3.5 + anim.archHeight
                            });
                        }
                    }
                }
            }
            
            return;
        }

        // Check if player is standing on a trigger tile
        const currentTile = worldPhase.worldMap.mapLayout.find(t => 
            Math.abs(t.rawPosition.x - worldPhase.player.x) < 0.1 && 
            Math.abs(t.rawPosition.y - worldPhase.player.y) < 0.1
        );

        if (currentTile && currentTile.isBridgeTrigger) {
            // Automatically trigger event
            if (!this.isActive && !this.transitioningToEvent) {
                this.triggerX = currentTile.rawPosition.x; // Grid X
                this.triggerY = currentTile.rawPosition.y; // Grid Y
                this.startEvent(worldPhase);
            }
        }
    }

    /**
     * Handles smooth camera transition.
     * @param {WorldPhase} worldPhase 
     * @param {number} deltaTime 
     * @param {boolean} intoEvent 
     */
    handleCameraTransition(worldPhase, deltaTime, intoEvent) {
        this.transitionProgress += deltaTime * 0.5; // 2 seconds transition
        
        if (this.transitionProgress >= 1) {
            this.transitionProgress = 1;
            if (intoEvent) {
                this.transitioningToEvent = false;
                this.isActive = true;
                this.buildUI();
            } else {
                this.transitioningToWorld = false;
                this.isCompleted = true;
                worldPhase.isTransitioning = false; // Give camera back
            }
        }

        const t = this.transitionProgress;
        const ease = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
        
        let startP = intoEvent ? this.startCameraPos : this.eventCameraPos;
        let targetP = intoEvent ? this.eventCameraPos : this.endCameraPos;
        let startL = intoEvent ? this.startCameraLookAt : this.eventCameraLookAt;
        let targetL = intoEvent ? this.eventCameraLookAt : this.endCameraLookAt;
        
        worldPhase.camera.position.lerpVectors(startP, targetP, ease);
        const currentLookAt = new THREE.Vector3().lerpVectors(startL, targetL, ease);
        worldPhase.camera.lookAt(currentLookAt);
    }

    /**
     * Starts the event sequence.
     * @param {WorldPhase} worldPhase
     */
    startEvent(worldPhase) {
        worldPhase.isTransitioning = true; // Take over camera control
        this.transitioningToEvent = true;
        this.transitionProgress = 0;
        
        const playerPos = worldPhase.player.mesh.position;
        this.startCameraPos.copy(worldPhase.camera.position);
        this.startCameraLookAt.copy(playerPos);
        
        const bridgeCenterZ = playerPos.z - (2.5 * worldPhase.player.spacingZ);
        
        // Define where the camera sits during the event
        this.eventCameraPos = new THREE.Vector3(
            playerPos.x + 18,
            playerPos.y + 12,
            bridgeCenterZ
        );
        this.eventCameraLookAt = new THREE.Vector3(
            playerPos.x,
            playerPos.y,
            bridgeCenterZ
        );
    }

    /**
     * Handles keyboard input during the event.
     * @param {WorldPhase} worldPhase
     * @param {KeyboardEvent} event
     * @returns {boolean}
     */
    handleKeyDown(worldPhase, event) {
        if (!this.isActive) {
            if (this.transitioningToEvent || this.transitioningToWorld) return true;
            return false;
        }

        if (event.key === "Backspace") {
            if (this.errorKey) {
                if (this.errorTimeout) clearTimeout(this.errorTimeout);
                this.errorKey = null;
            } else {
                this.currentTyped = this.currentTyped.slice(0, -1);
            }
            this.updateWordDisplay();
            return true;
        }
        
        const key = event.key.toUpperCase();
        if (key.length === 1 && key.match(/[A-Z]/)) {
            // If they type while an error is showing, clear it immediately
            if (this.errorKey) {
                if (this.errorTimeout) clearTimeout(this.errorTimeout);
                this.errorKey = null;
            }

            const nextTyped = this.currentTyped + key;
            const matchIndex = this.wordStates.findIndex(ws => !ws.completed && ws.word.startsWith(nextTyped));
            
            if (matchIndex !== -1) {
                this.currentTyped = nextTyped;
                const exactMatchIndex = this.wordStates.findIndex(ws => !ws.completed && ws.word === nextTyped);
                
                if (exactMatchIndex !== -1) {
                    this.wordStates[exactMatchIndex].completed = true;
                    this.completedCount++;
                    this.addBridgePiece(worldPhase);
                    this.currentTyped = "";
                    
                    if (this.completedCount === this.targetCompletedCount) {
                        this.finishEvent(worldPhase);
                    }
                }
                this.updateWordDisplay();
            } else {
                this.errorKey = key;
                this.updateWordDisplay();
                
                if (this.errorTimeout) clearTimeout(this.errorTimeout);
                this.errorTimeout = setTimeout(() => {
                    this.errorKey = null;
                    // Removed: this.currentTyped = "";
                    this.updateWordDisplay();
                }, 400); // Shorter flash duration
            }
        }
        return true; 
    }

    /**
     * Adds a piece to the bridge in 3D.
     * @param {WorldPhase} worldPhase
     */
    addBridgePiece(worldPhase) {
        const progress = this.completedCount; // 1 to 5
        const targetGridY = this.triggerY - progress; 

        // Straighten the bridge by interpolating X between trigger row and island row
        const triggerRow = worldPhase.worldMap.mapLayout.filter(t => t.rawPosition.y === this.triggerY);
        const islandRow = worldPhase.worldMap.mapLayout.filter(t => t.rawPosition.y === this.triggerY - 6);
        
        const triggerCenter = triggerRow.reduce((sum, t) => sum + t.rawPosition.x, 0) / triggerRow.length;
        const islandCenter = islandRow.reduce((sum, t) => sum + t.rawPosition.x, 0) / islandRow.length;

        const fraction = progress / 6;
        const expectedCenterX = triggerCenter + fraction * (islandCenter - triggerCenter);

        const rowTiles = worldPhase.worldMap.mapLayout.filter(t => t.rawPosition.y === targetGridY);
        const currentCenterX = rowTiles.reduce((sum, t) => sum + t.rawPosition.x, 0) / rowTiles.length;
        const shiftX = expectedCenterX - currentCenterX;
        
        let centerTile = null;

        const sideMaterial = new THREE.MeshStandardMaterial({
            map: worldPhase.worldMap.stoneTexture,
            color: 0xffffff,
            roughness: 0.8,
            metalness: 0.2,
        });

        let archHeight = 0;
        if (progress === 1 || progress === 5) archHeight = 0.8;
        else if (progress === 2 || progress === 4) archHeight = 1.8;
        else if (progress === 3) archHeight = 2.8;

        for (const tile of rowTiles) {
            tile.isRavine = false;
            
            // Apply alignment shift
            tile.rawPosition.x += shiftX;
            tile.x = (tile.rawPosition.x * Math.sqrt(3) * 1.5) + 12;
            
            const group = new THREE.Group();

            // Small purple magical particles
            const particleCount = 30;
            const particleGeometry = new THREE.BufferGeometry();
            const particlePositions = new Float32Array(particleCount * 3);
            
            for (let i = 0; i < particleCount * 3; i += 3) {
                const angle = Math.random() * Math.PI * 2;
                const r = Math.random() * 1.3;
                particlePositions[i] = Math.cos(angle) * r;
                particlePositions[i+1] = -Math.random() * 2.0; // Random depth
                particlePositions[i+2] = Math.sin(angle) * r;
            }
            particleGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
            
            const particleMaterial = new THREE.PointsMaterial({
                color: 0xa855f7, // Bright purple
                size: 0.15,
                transparent: true,
                opacity: 0.8,
                blending: THREE.AdditiveBlending,
                depthWrite: false
            });
            const magicMesh = new THREE.Points(particleGeometry, particleMaterial);
            magicMesh.position.y = 1.6; // Base of the slab
            
            const bevelGeometry = new THREE.CylinderGeometry(1.3, 1.5, 0.4, 6);
            const bevelMesh = new THREE.Mesh(bevelGeometry, [
                sideMaterial,
                sideMaterial,
                sideMaterial,
            ]);
            bevelMesh.position.y = 1.8;

            const lineMaterial = new THREE.LineBasicMaterial({ color: 0x333333 });
            const bevelEdges = new THREE.EdgesGeometry(bevelGeometry);
            const bevelLine = new THREE.LineSegments(bevelEdges, lineMaterial);
            bevelMesh.add(bevelLine);

            group.add(magicMesh);
            group.add(bevelMesh);

            group.material = [sideMaterial, sideMaterial, sideMaterial];
            group.lineMaterial = lineMaterial;
            
            const random_z = archHeight + Math.random() * 0.4;
            tile.baseY = random_z;
            
            // Start the tile deeply submerged
            group.position.set(tile.x, -15, tile.y);
            group.rotation.y = 0;

            worldPhase.gameEngine.scene.add(group);
            this.bridgeMeshes.push(group);
            tile.mesh = group;
            
            if (Math.abs(tile.rawPosition.x - (worldPhase.player.x + 0.5)) < 0.1) {
                centerTile = tile;
            }

            this.animatingTiles.push({
                mesh: group,
                targetY: random_z,
                archHeight: archHeight,
                isCenter: false,
                tile: tile,
                worldPhase: worldPhase
            });
        }

        if (!centerTile && rowTiles.length > 0) {
            centerTile = rowTiles[Math.floor(rowTiles.length / 2)];
        }
        
        // Assign center flag for player movement sync
        for (const anim of this.animatingTiles) {
            if (anim.tile === centerTile) {
                anim.isCenter = true;
            }
        }
        
        // Add a magical light at the center of the newly built section
        if (centerTile) {
            const light = new THREE.PointLight(0xf1c40f, 100, 5);
            light.position.set(0, 3, 0); 
            centerTile.mesh.add(light);
        }
    }

    /**
     * Finishes the event and restores the camera smoothly to where it SHOULD be.
     * @param {WorldPhase} worldPhase 
     */
    finishEvent(worldPhase) {
        if (this.uiOverlay) {
            this.uiOverlay.remove();
            this.uiOverlay = null;
        }
        
        this.isActive = false;
        this.transitioningToWorld = true;
        this.transitionProgress = 0;
        
        const playerPos = worldPhase.player.mesh.position;
        
        // Target camera position is WorldPhase's default follow cam
        this.endCameraPos = new THREE.Vector3(
            playerPos.x + 5,
            playerPos.y + 21,
            playerPos.z + 14
        );
        this.endCameraLookAt = new THREE.Vector3(
            playerPos.x,
            playerPos.y,
            playerPos.z
        );
    }

    /**
     * Builds the HTML UI overlay.
     */
    buildUI() {
        // Inject styles if they don't exist
        if (!document.getElementById("bridge-event-styles")) {
            const style = document.createElement("style");
            style.id = "bridge-event-styles";
            style.innerHTML = `
                .mission-overlay {
                    position: absolute;
                    bottom: 30px;
                    left: 50%;
                    transform: translateX(-50%);
                    width: 90%;
                    max-width: 900px;
                    pointer-events: none;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    z-index: 10;
                }
                .mission-instruction {
                    color: #e2e8f0;
                    font-size: 1.1rem;
                    font-weight: 600;
                    letter-spacing: 3px;
                    text-transform: uppercase;
                    margin-bottom: 20px;
                    font-family: 'Inter', sans-serif;
                    background: linear-gradient(135deg, rgba(255,255,255,0.1), rgba(255,255,255,0.02));
                    padding: 12px 35px;
                    border-radius: 20px;
                    border: 1px solid rgba(255, 255, 255, 0.15);
                    backdrop-filter: blur(12px);
                    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
                }
                .mission-word-container {
                    display: flex;
                    flex-wrap: wrap;
                    justify-content: center;
                    gap: 12px;
                    width: 100%;
                    background: rgba(15, 23, 42, 0.45);
                    backdrop-filter: blur(16px);
                    border: 1px solid rgba(255, 255, 255, 0.08);
                    border-top: 1px solid rgba(255, 255, 255, 0.15);
                    border-radius: 24px;
                    padding: 25px 30px;
                    box-shadow: 0 15px 50px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255,255,255,0.05);
                }
                .mission-word {
                    font-size: 1.05rem;
                    font-weight: 600;
                    letter-spacing: 1.5px;
                    color: rgba(255, 255, 255, 0.4);
                    background: rgba(255, 255, 255, 0.04);
                    padding: 8px 18px;
                    border-radius: 12px;
                    border: 1px solid rgba(255, 255, 255, 0.03);
                    transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
                    font-family: 'Inter', sans-serif;
                }
                .mission-word.completed {
                    opacity: 0.15;
                    transform: scale(0.95);
                    background: rgba(46, 204, 113, 0.1);
                    border-color: rgba(46, 204, 113, 0.1);
                }
                .mission-word span.typed {
                    color: #f1c40f;
                    text-shadow: 0 0 10px rgba(241, 196, 15, 0.6), 0 0 20px rgba(241, 196, 15, 0.3);
                }
                .mission-word span.error-typed {
                    color: #ff4757;
                    text-shadow: 0 0 10px rgba(255, 71, 87, 0.8);
                }
            `;
            document.head.appendChild(style);
        }

        this.uiOverlay = document.createElement("div");
        this.uiOverlay.classList.add("mission-overlay");

        const instructionDisplay = document.createElement("div");
        instructionDisplay.classList.add("mission-instruction");
        instructionDisplay.innerText = "TYPE ANY WORD TO BUILD THE BRIDGE!";

        this.wordDisplay = document.createElement("div");
        this.wordDisplay.classList.add("mission-word-container");
        
        this.uiOverlay.appendChild(instructionDisplay);
        this.uiOverlay.appendChild(this.wordDisplay);
        document.body.appendChild(this.uiOverlay);
        
        this.updateWordDisplay();
    }

    /**
     * Updates the UI text.
     */
    updateWordDisplay() {
        if (!this.wordDisplay) return;
        this.wordDisplay.innerHTML = "";
        
        this.wordStates.forEach(ws => {
            const wordEl = document.createElement("div");
            wordEl.classList.add("mission-word");
            
            if (ws.completed) {
                wordEl.innerText = ws.word;
                wordEl.classList.add("completed");
            } else if (ws.word.startsWith(this.currentTyped) && (this.currentTyped.length > 0 || this.errorKey)) {
                // Also match if currentTyped is empty but there's an errorKey
                
                const typedSpan = document.createElement("span");
                typedSpan.classList.add("typed");
                typedSpan.innerText = this.currentTyped;
                wordEl.appendChild(typedSpan);
                
                let remainingWord = ws.word.substring(this.currentTyped.length);
                
                if (this.errorKey) {
                    const errorSpan = document.createElement("span");
                    errorSpan.classList.add("error-typed");
                    errorSpan.innerText = this.errorKey;
                    wordEl.appendChild(errorSpan);
                    
                    if (remainingWord.length > 0) {
                        remainingWord = remainingWord.substring(1);
                    }
                }
                
                const restSpan = document.createElement("span");
                restSpan.innerText = remainingWord;
                wordEl.appendChild(restSpan);
            } else {
                wordEl.innerText = ws.word;
            }
            
            this.wordDisplay.appendChild(wordEl);
        });
    }

    /**
     * Cleans up resources.
     * @param {WorldPhase} worldPhase
     */
    cleanup(worldPhase) {
        if (this.uiOverlay) {
            this.uiOverlay.remove();
        }
        const style = document.getElementById("bridge-event-styles");
        if (style) style.remove();

        for (const mesh of this.bridgeMeshes) {
            worldPhase.gameEngine.scene.remove(mesh);
            if (mesh.geometry) mesh.geometry.dispose();
            if (mesh.material) mesh.material.dispose();
        }
        this.bridgeMeshes = [];
    }
}
