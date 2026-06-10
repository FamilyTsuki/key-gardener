import * as THREE from "three";
import { applyTriplanarMapping } from "../utilities/TextureUtils.js";
import { WorldEvent } from "./WorldEvent.js";
import { LanguageManager } from "../../core/utils/LanguageManager.js";

/**
 * Event for handling interaction with a door in the world phase.
 */
export class DoorEvent extends WorldEvent {
    /**
     * Creates an instance of DoorEvent.
     */
    constructor() {
        super();
        this.isDoorSequenceActive = false;
        const seq = LanguageManager.t("game.doorSequence");
        this.doorSequence = Array.isArray(seq) ? seq : ["O", "P", "E", "N"];
        this.doorSequenceIndex = 0;
        this.isDoorOpen = false;
        this.isOpeningDoor = false;
        this.enterPromptOverlay = null;
        this.uiOverlay = null;
        this.errorTimeout = null;
        this.leftDoorPivot = null;
        this.rightDoorPivot = null;
        this.doorTileId = null;
    }

    /**
     * Mutates the map layout to specify which tile is the door tile.
     * @param {Array} mapLayout - The raw map layout array.
     */
    modifyLayout(mapLayout) {
        const doorRow = mapLayout.filter((t) => t.y === -34);
        if (doorRow.length > 0) {
            doorRow.sort((a, b) => a.x - b.x);
            const centerTile = doorRow[Math.floor(doorRow.length / 2)];
            if (centerTile) {
                this.doorTileId = centerTile.id;
            }
        }
    }

    /**
     * Initializes the door event, building the door mesh on the designated tile.
     * @param {WorldPhase} worldPhase - The world phase instance.
     * @param {THREE.Scene} scene - The scene instance.
     * @returns {Promise<void>}
     */
    async init(worldPhase, scene) {
        if (!worldPhase.worldMap || !this.doorTileId) return;

        const doorTile = worldPhase.worldMap.mapLayout.find((t) => t.id === this.doorTileId);
        if (doorTile && doorTile.mesh) {
            const stoneTexture = worldPhase.worldMap.stoneTexture;
            this.buildDoor(doorTile.mesh, stoneTexture);
        }
    }

    /**
     * Creates a decorative door on a given tile mesh.
     * @param {THREE.Object3D} parentMesh - The parent mesh for the door.
     * @param {THREE.Texture} [stoneTexture] - The texture for the door walls/tunnel.
     */
    buildDoor(parentMesh, stoneTexture) {
        const doorGroup = new THREE.Group();

        const pillarMat = new THREE.MeshStandardMaterial({
            map: stoneTexture,
            color: 0x888888,
            roughness: 0.9,
            metalness: 0.1,
        });

        const pillarGeo = new THREE.BoxGeometry(1.5, 12, 1.5);
        const leftPillar = new THREE.Mesh(pillarGeo, pillarMat);
        leftPillar.position.set(-3, 6, 0);

        const rightPillar = new THREE.Mesh(pillarGeo, pillarMat);
        rightPillar.position.set(3, 6, 0);

        const archGeo = new THREE.BoxGeometry(7.5, 2, 1.5);
        const arch = new THREE.Mesh(archGeo, pillarMat);
        arch.position.set(0, 13, 0);

        const textureLoader = new THREE.TextureLoader();
        const doorTexture = textureLoader.load('/asset/game_assets/textures/door.webp');
        

        const doorMat = new THREE.MeshStandardMaterial({
            map: doorTexture,
            color: 0xffffff,
            roughness: 0.8,
            metalness: 0.3,
        });
        const doorGeo = new THREE.BoxGeometry(2.25, 12, 0.5);

        const leftDoorTexture = doorTexture.clone();
        leftDoorTexture.wrapS = THREE.RepeatWrapping;
        leftDoorTexture.repeat.x = -1;
        leftDoorTexture.needsUpdate = true;

        const leftDoorMat = doorMat.clone();
        leftDoorMat.map = leftDoorTexture;

        const doorMaterialsLeft = [
            doorMat, doorMat, doorMat, doorMat,
            leftDoorMat,
            doorMat
        ];

        const doorMaterialsRight = [
            doorMat, doorMat, doorMat, doorMat,
            doorMat,
            leftDoorMat
        ];

        const leftDoorPivot = new THREE.Group();
        leftDoorPivot.position.set(-2.25, 6, 0);
        const leftDoorMesh = new THREE.Mesh(doorGeo, doorMaterialsLeft);
        leftDoorMesh.position.set(1.125, 0, 0);
        leftDoorPivot.add(leftDoorMesh);

        const rightDoorPivot = new THREE.Group();
        rightDoorPivot.position.set(2.25, 6, 0);
        const rightDoorMesh = new THREE.Mesh(doorGeo, doorMaterialsRight);
        rightDoorMesh.position.set(-1.125, 0, 0);
        rightDoorPivot.add(rightDoorMesh);

        this.leftDoorPivot = leftDoorPivot;
        this.rightDoorPivot = rightDoorPivot;

        let wallTexture = null;
        let tunnelTexture = null;
        if (stoneTexture) {
            wallTexture = stoneTexture.clone();
            wallTexture.wrapS = THREE.RepeatWrapping;
            wallTexture.wrapT = THREE.RepeatWrapping;
            wallTexture.repeat.set(5, 4);
            wallTexture.needsUpdate = true;

            tunnelTexture = stoneTexture.clone();
            tunnelTexture.wrapS = THREE.RepeatWrapping;
            tunnelTexture.wrapT = THREE.RepeatWrapping;
            tunnelTexture.repeat.set(1, 2);
            tunnelTexture.needsUpdate = true;
        }



        const caveMat = new THREE.MeshStandardMaterial({
            map: wallTexture,
            color: 0x555566,
            roughness: 1.0,
            metalness: 0.1,
            flatShading: true
        });
        applyTriplanarMapping(caveMat);

        const rockLineMat = new THREE.LineBasicMaterial({
            color: 0x000000,
            transparent: true,
            opacity: 0.4
        });

        const wallGeo = new THREE.PlaneGeometry(60, 50, 60, 50);
        wallGeo.translate(0, 15, 0);

        const index = wallGeo.getIndex();
        const pos = wallGeo.attributes.position;
        const newIndices = [];
        
        for (let i = 0; i < index.count; i += 3) {
            const a = index.getX(i);
            const b = index.getX(i + 1);
            const c = index.getX(i + 2);
            
            const cx = (pos.getX(a) + pos.getX(b) + pos.getX(c)) / 3;
            const cy = (pos.getY(a) + pos.getY(b) + pos.getY(c)) / 3;
            
            if (Math.abs(cx) < 2.8 && cy > -0.5 && cy < 12.8) {
                continue;
            }
            newIndices.push(a, b, c);
        }
        wallGeo.setIndex(newIndices);

        for (let i = 0; i < pos.count; i++) {
            let x = pos.getX(i);
            let y = pos.getY(i);
            let z = pos.getZ(i);

            let distToEdgeX = Math.max(0, Math.abs(x) - 3.0);
            let distToEdgeY = Math.max(0, y - 13.0);
            let distToEdgeBottom = Math.max(0, -0.5 - y);
            
            let distToEdge = Math.sqrt(distToEdgeX * distToEdgeX + distToEdgeY * distToEdgeY + distToEdgeBottom * distToEdgeBottom);
            let attenuation = Math.min(1.0, distToEdge / 6.0);
            attenuation = attenuation * attenuation * (3 - 2 * attenuation);

            let noiseZ = 0;
            noiseZ += (Math.sin(x * 0.31 + y * 0.27) + Math.cos(x * 0.23 - y * 0.33)) * 1.5;
            noiseZ += (Math.sin(x * 0.67 + y * 0.59) + Math.cos(x * 0.61 - y * 0.73)) * 0.75;
            noiseZ += (Math.sin(x * 1.37 + y * 1.29) + Math.cos(x * 1.21 - y * 1.43)) * 0.35;
            noiseZ += (Math.sin(x * 2.71 + y * 2.57) + Math.cos(x * 2.51 - y * 2.83)) * 0.15;
            
            noiseZ = (noiseZ - 1.5) * attenuation;
            pos.setZ(i, z + noiseZ);
        }
        wallGeo.computeVertexNormals();

        const wallMesh = new THREE.Mesh(wallGeo, caveMat);
        wallMesh.position.set(0, 0, -1.0);
        
        const wallEdges = new THREE.EdgesGeometry(wallGeo);
        const wallLine = new THREE.LineSegments(wallEdges, rockLineMat);
        wallMesh.add(wallLine);
        doorGroup.add(wallMesh);

        const tunnelGeo = new THREE.BoxGeometry(5.4, 15.0, 20, 3, 3, 3);
        const tunnelPos = tunnelGeo.attributes.position;
        for (let i = 0; i < tunnelPos.count; i++) {
            let x = tunnelPos.getX(i);
            let y = tunnelPos.getY(i);
            let z = tunnelPos.getZ(i);
            const noise = (Math.sin(x * 1.2) + Math.cos(y * 1.2) + Math.sin(z * 1.2)) * 0.4;
            tunnelPos.setX(i, x + noise);
            tunnelPos.setY(i, y + noise);
            tunnelPos.setZ(i, z + noise);
        }
        tunnelGeo.computeVertexNormals();
        
        const tunnelMat = new THREE.MeshStandardMaterial({
            map: stoneTexture,
            color: 0x333344,
            roughness: 1.0,
            metalness: 0.1,
            flatShading: true,
            side: THREE.BackSide
        });
        applyTriplanarMapping(tunnelMat);
        const tunnelMesh = new THREE.Mesh(tunnelGeo, tunnelMat);
        tunnelMesh.position.set(0, 6.0, -10.5);
        
        const tunnelEdges = new THREE.EdgesGeometry(tunnelGeo);
        const tunnelLine = new THREE.LineSegments(tunnelEdges, rockLineMat);
        tunnelMesh.add(tunnelLine);
        doorGroup.add(tunnelMesh);

        const backdropGeo = new THREE.PlaneGeometry(10, 20);
        const backdropMat = new THREE.MeshBasicMaterial({ color: 0x050508 });
        const backdrop = new THREE.Mesh(backdropGeo, backdropMat);
        backdrop.position.set(0, 6.5, -19.5);
        doorGroup.add(backdrop);

        doorGroup.add(leftPillar);
        doorGroup.add(rightPillar);
        doorGroup.add(arch);
        doorGroup.add(leftDoorPivot);
        doorGroup.add(rightDoorPivot);

        doorGroup.position.set(0, 2, 0);
        doorGroup.rotation.y = -Math.PI / 6;
        parentMesh.add(doorGroup);
    }

    /**
     * Animates the door opening.
     * @returns {Promise<void>} Resolves when the animation finishes.
     */
    openDoor() {
        return new Promise((resolve) => {
            if (!this.leftDoorPivot || !this.rightDoorPivot) {
                resolve();
                return;
            }
            const duration = 1500;
            const startTime = performance.now();

            const animateFade = (time) => {
                const elapsed = time - startTime;
                const progress = Math.min(elapsed / duration, 1);

                const angle = progress * (Math.PI / 2);
                this.leftDoorPivot.rotation.y = -angle;
                this.rightDoorPivot.rotation.y = angle;

                if (progress < 1) {
                    requestAnimationFrame(animateFade);
                } else {
                    resolve();
                }
            };
            requestAnimationFrame(animateFade);
        });
    }

    /**
     * Updates the state of the door event, checking player proximity.
     * @param {WorldPhase} worldPhase - The world phase instance.
     * @param {number} deltaTime - Time elapsed since last frame.
     */
    update(worldPhase, deltaTime) {
        if (!worldPhase.player || !worldPhase.worldMap || !this.doorTileId) return;

        const doorTile = worldPhase.worldMap.mapLayout.find(
            (t) => t.id === this.doorTileId
        );
        if (doorTile) {
            const dx = doorTile.rawPosition.x - worldPhase.player.x;
            const dy = doorTile.rawPosition.y - worldPhase.player.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (!this.isDoorOpen && !this.isOpeningDoor) {
                if (dist < 2.5 && !this.isDoorSequenceActive) {
                    this.startDoorSequence(worldPhase);
                }
            } else if (this.isDoorOpen) {
                if (dist < 1.5 && !worldPhase.isTransitioning) {
                    this.showEnterPrompt(worldPhase);
                } else {
                    this.hideEnterPrompt(worldPhase);
                }
            }
        }
    }

    /**
     * Handles keyboard input during the door sequence or interaction.
     * @param {WorldPhase} worldPhase - The world phase instance.
     * @param {KeyboardEvent} event - The keyboard event.
     * @returns {boolean} True if the event was intercepted, false otherwise.
     */
    handleKeyDown(worldPhase, event) {
        if (this.isOpeningDoor) {
            return true;
        }

        if (this.isDoorSequenceActive) {
            const keyName = event.key.toUpperCase();
            if (keyName === this.doorSequence[this.doorSequenceIndex]) {
                this.doorSequenceIndex++;
                this.updateDoorUI();
                if (this.doorSequenceIndex >= this.doorSequence.length) {
                    this.completeDoorSequence(worldPhase);
                }
            } else {
                if (this.uiOverlay) {
                    this.doorSequenceIndex = 0;
                    this.updateDoorUI();
                    this.uiOverlay.classList.remove("error");
                    void this.uiOverlay.offsetWidth;
                    this.uiOverlay.classList.add("error");

                    if (this.errorTimeout) clearTimeout(this.errorTimeout);
                    this.errorTimeout = setTimeout(() => {
                        if (this.uiOverlay)
                            this.uiOverlay.classList.remove("error");
                    }, 400);
                }
            }
            return true;
        }

        if (worldPhase.isTransitioning) return false;

        const keyName = event.key.toUpperCase();
        if (this.isDoorOpen && keyName === "ENTER") {
            const doorTile = worldPhase.worldMap.mapLayout.find(
                (t) => t.id === this.doorTileId
            );
            if (doorTile) {
                const dx = doorTile.rawPosition.x - worldPhase.player.x;
                const dy = doorTile.rawPosition.y - worldPhase.player.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < 1.5) {
                    worldPhase.isTransitioning = true;
                    
                    if (this.enterPromptOverlay) {
                        const keyElement = this.enterPromptOverlay.querySelector('.enter-prompt-key');
                        if (keyElement) keyElement.classList.add("active");
                    }
                    
                    setTimeout(() => {
                        this.hideEnterPrompt(worldPhase);
                        
                        worldPhase.player.move({
                            x: doorTile.rawPosition.x*2,
                            y: doorTile.rawPosition.y*2
                        });
                        worldPhase.player.movementDuration = 480;
                        
                        worldPhase.player.facingDirection = { x: 0, y: -1 };
                        if (worldPhase.player.mesh) {
                            worldPhase.player.mesh.rotation.set(0, Math.PI, 0);
                        }
                        
                        const overlay = document.createElement("div");
                        overlay.classList.add("phase-transition-overlay");
                        document.body.appendChild(overlay);

                        setTimeout(() => {
                            overlay.classList.add("active");
                        }, 150); 
                        
                        setTimeout(async () => {
                            await worldPhase.gameEngine.nextLevel();
                            
                            overlay.classList.remove("active");
                            setTimeout(() => {
                                overlay.remove();
                            }, 1000);
                        }, 1400);
                    }, 150);
                    
                    return true;
                }
            }
        }
        return false;
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
        if (this.errorTimeout) clearTimeout(this.errorTimeout);
    }

    /**
     * Starts the door opening mini-game sequence.
     * @param {WorldPhase} worldPhase - The world phase instance.
     */
    startDoorSequence(worldPhase) {
        this.isDoorSequenceActive = true;
        this.doorSequenceIndex = 0;

        this.uiOverlay = document.createElement("div");
        this.uiOverlay.classList.add("door-mini-game-overlay");

        document.body.appendChild(this.uiOverlay);
        this.updateDoorUI();
    }

    /**
     * Updates the UI for the door opening sequence.
     */
    updateDoorUI() {
        if (!this.uiOverlay) return;
        this.uiOverlay.innerHTML = "";

        this.doorSequence.forEach((letter, index) => {
            const letterBox = document.createElement("div");
            letterBox.innerText = letter;
            letterBox.classList.add("door-mini-game-letter");

            if (index < this.doorSequenceIndex) {
                letterBox.classList.add("done");
            } else if (index === this.doorSequenceIndex) {
                letterBox.classList.add("active");
            } else {
                letterBox.classList.add("pending");
            }
            this.uiOverlay.appendChild(letterBox);
        });
    }

    /**
     * Completes the door sequence and opens the door.
     * @param {WorldPhase} worldPhase - The world phase instance.
     * @returns {Promise<void>}
     */
    async completeDoorSequence(worldPhase) {
        this.isDoorSequenceActive = false;
        this.isOpeningDoor = true;

        if (this.uiOverlay) {
            this.uiOverlay.remove();
            this.uiOverlay = null;
        }

        await this.openDoor();

        this.isOpeningDoor = false;
        this.isDoorOpen = true;
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
        titleDiv.innerText = LanguageManager.t("game.enterPortal");

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
