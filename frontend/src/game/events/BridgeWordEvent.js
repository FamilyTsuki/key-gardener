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
        
        const words = [
            "PONT", "BOIS", "CORDE", "CLOU", "POUTRE", "PLANCHE", "PIERRE", "MARTEAU", "SCIE", 
            "FER", "ACIER", "BETON", "PILIER", "ARCHE", "FONDATION", "CABLE", "RIVET", "POULIE", 
            "TENDEUR", "CHAINE", "CIMENT", "SABLE", "GRAVIER", "BRIQUE", "MOELLON", "CHARPENTE",
            "CONSTRUIRE", "BATIR", "ASSEMBLER", "CLOUER", "SCIER", "FORGER", "SOUDER", "MONTER", 
            "PERCER", "COULER", "HISSER", "FIXER", "LEVER", "TIRER", "POUSSER", "REPARER"
        ];
        this.wordDictionary = words;
        this.activeWords = [];
        this.baseSpawnDelay = 3.0; 
        this.wordSpawnTimer = 0;
        this.nextWordId = 0;
        
        this.targetCompletedCount = 10; 
        this.completedCount = 0;
        this.piecesBuilt = 0;
        this.currentTyped = "";
        this.currentWordId = null;
        
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

        this.updateBridgeParticles(deltaTime);

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
            worldPhase.camera.position.copy(this.eventCameraPos);
            worldPhase.camera.lookAt(this.eventCameraLookAt);
            
            this.updateWordLifecycle(deltaTime);
            this.updateTileAnimations(deltaTime);
            
            return;
        }

        this.checkBridgeTrigger(worldPhase);
    }
    /**
     * Updates the bridge particles.
     * @param {number} deltaTime - The time delta.
     */
    updateBridgeParticles(deltaTime) {}
    /**
     * Updates the word lifecycle.
     * @param {number} deltaTime - The time delta.
     */
    updateWordLifecycle(deltaTime) {
        let needsFullUpdate = false;
        this.wordSpawnTimer -= deltaTime;
        if (this.wordSpawnTimer <= 0 && this.activeWords.length < 4) {
            this.spawnWord();
            this.wordSpawnTimer = this.baseSpawnDelay + Math.random() * 1.0;
            needsFullUpdate = true;
        }

        for (let i = this.activeWords.length - 1; i >= 0; i--) {
            const w = this.activeWords[i];
            w.age += deltaTime;

            if (w.phase === "growing") {
                w.scale = Math.min(1, w.age / 0.5);
                if (w.age >= 0.5) w.phase = "waiting";
            } else if (w.phase === "waiting") {
                if (w.age >= 8.5) w.phase = "disappearing";
            } else if (w.phase === "disappearing") {
                w.scale = Math.max(0, 1 - (w.age - 8.5) / 1.0);
                if (w.age >= 9.5) {
                    this.activeWords.splice(i, 1);
                    needsFullUpdate = true;
                    this.baseSpawnDelay = Math.min(5.0, this.baseSpawnDelay + 0.5); 
                    if (this.currentWordId === w.id) {
                        this.currentTyped = "";
                        this.currentWordId = null;
                        if (this.errorTimeout) {
                            clearTimeout(this.errorTimeout);
                            this.errorKey = null;
                        }
                    }
                }
            } else if (w.phase === "completed") {
                w.scale = 1 + (w.age / 0.3) * 0.2;
                w.opacity = Math.max(0, 1 - (w.age / 0.3));
                if (w.age >= 0.3) {
                    this.activeWords.splice(i, 1);
                    needsFullUpdate = true;
                }
            }
            
            if (this.wordDisplay) {
                const wordEl = document.getElementById('word-' + w.id);
                if (wordEl) {
                    wordEl.style.transform = `translate(-50%, -50%) scale(${w.scale})`;
                    wordEl.style.opacity = (w.phase === "completed") ? w.opacity : w.scale;
                }
            }
        }
        
        if (needsFullUpdate) {
            this.updateWordDisplay();
        }
    }
    /**
     * Updates the tile animations.
     * @param {number} deltaTime - The time delta.
     */
    updateTileAnimations(deltaTime) {
        if (this.animatingTiles.length === 0) return;
        
        for (let i = this.animatingTiles.length - 1; i >= 0; i--) {
            const anim = this.animatingTiles[i];
            
            if (anim.progress === undefined) {
                anim.progress = 0;
                anim.startY = anim.currentY;
                anim.duration = 0.5 + Math.random() * 0.2;
            }
            
            anim.progress += deltaTime / anim.duration;
            let finished = false;
            if (anim.progress >= 1) {
                anim.progress = 1;
                finished = true;
            }

            const t = anim.progress;
            const c1 = 1.70158;
            const c3 = c1 + 1;
            const ease = 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);

            anim.currentY = anim.startY + (anim.targetY - anim.startY) * ease;
            anim.mesh.position.y = anim.currentY;

            if (finished) {
                anim.mesh.position.y = anim.targetY;
                anim.tile.mesh = anim.mesh; 
                this.animatingTiles.splice(i, 1);
                
                if (anim.isCenter && anim.worldPhase) {
                    anim.worldPhase.player.move({ 
                        x: anim.tile.rawPosition.x, 
                        y: anim.tile.rawPosition.y,
                        offsetY: 2.9 + anim.tile.baseY
                    });
                }
            }
        }
    }
    /**
     * Checks if the bridge trigger should be activated.
     * @param {WorldPhase} worldPhase - The current world phase.
     */
    checkBridgeTrigger(worldPhase) {
        const currentTile = worldPhase.worldMap.mapLayout.find(t => 
            Math.abs(t.rawPosition.x - worldPhase.player.x) < 0.1 && 
            Math.abs(t.rawPosition.y - worldPhase.player.y) < 0.1
        );

        if (currentTile && currentTile.isBridgeTrigger) {
            if (!this.isActive && !this.transitioningToEvent) {
                this.triggerX = currentTile.rawPosition.x;
                this.triggerY = currentTile.rawPosition.y;
                this.startEvent(worldPhase);
            }
        }
    }

    /**
     * Spawns a new word.
     */
    spawnWord() {
        const wordStr = this.wordDictionary[Math.floor(Math.random() * this.wordDictionary.length)];
        
        let x, y;
        let validPosition = false;
        let attempts = 0;
        
        while (!validPosition && attempts < 50) {
            x = 15 + Math.random() * 70;
            y = 25 + Math.random() * 55;
            validPosition = true;
            
            for (const w of this.activeWords) {
                const dx = Math.abs(x - w.x);
                const dy = Math.abs(y - w.y);
                if (dx < 15 && dy < 10) {
                    validPosition = false;
                    break;
                }
            }
            attempts++;
        }

        this.activeWords.push({
            id: this.nextWordId++,
            word: wordStr,
            x: x,
            y: y,
            scale: 0,
            age: 0,
            phase: "growing",
            errorFlash: false
        });
    }

    /**
     * Handles smooth camera transition.
     * @param {WorldPhase} worldPhase 
     * @param {number} deltaTime 
     * @param {boolean} intoEvent 
     */
    handleCameraTransition(worldPhase, deltaTime, intoEvent) {
        this.transitionProgress += deltaTime * 0.5;
        
        if (this.transitionProgress >= 1) {
            this.transitionProgress = 1;
            if (intoEvent) {
                this.transitioningToEvent = false;
                this.isActive = true;
                this.buildUI();
            } else {
                this.transitioningToWorld = false;
                this.isCompleted = true;
                worldPhase.isTransitioning = false; 
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
        if (!document.getElementById("bridge-event-styles")) {
            const link = document.createElement("link");
            link.id = "bridge-event-styles";
            link.rel = "stylesheet";
            link.href = "/asset/css/bridgeEvent.css";
            document.head.appendChild(link);
        }

        worldPhase.isTransitioning = true; 
        this.transitioningToEvent = true;
        this.transitionProgress = 0;
        
        const playerPos = worldPhase.player.mesh.position;
        this.startCameraPos.copy(worldPhase.camera.position);
        this.startCameraLookAt.copy(playerPos);
        this.tilesToBuild = [];
        
        const triggerRow = worldPhase.worldMap.mapLayout.filter(t => t.rawPosition.y === this.triggerY);
        const islandRow = worldPhase.worldMap.mapLayout.filter(t => t.rawPosition.y === this.triggerY - 6);
        
        let triggerCenter = 0;
        if (triggerRow.length > 0) triggerCenter = triggerRow.reduce((sum, t) => sum + t.rawPosition.x, 0) / triggerRow.length;

        let islandCenter = 0;
        if (islandRow.length > 0) islandCenter = islandRow.reduce((sum, t) => sum + t.rawPosition.x, 0) / islandRow.length;

        const startX = (triggerCenter * Math.sqrt(3) * 1.5) + 12;
        const startZ = this.triggerY * 2.25;

        const endX = (islandCenter * Math.sqrt(3) * 1.5) + 12;
        const endZ = (this.triggerY - 6) * 2.25;

        const bridgeWorldX = (startX + endX) / 2;
        const bridgeWorldZ = (startZ + endZ) / 2;

        const dirX = endX - startX;
        const dirZ = endZ - startZ;
        const length = Math.sqrt(dirX * dirX + dirZ * dirZ);

        const perpX = -dirZ / length;
        const perpZ = dirX / length;

        const distance = 18;
        this.eventCameraPos = new THREE.Vector3(
            bridgeWorldX + perpX * distance,
            14,
            bridgeWorldZ + perpZ * distance
        );
        this.eventCameraLookAt = new THREE.Vector3(
            bridgeWorldX,
            2,
            bridgeWorldZ
        );

        for (let progress = 1; progress <= 5; progress++) {
            const targetGridY = this.triggerY - progress;
            const rowTiles = worldPhase.worldMap.mapLayout.filter(t => t.rawPosition.y === targetGridY);
            if (rowTiles.length === 0) continue;
            
            const currentCenterX = rowTiles.reduce((sum, t) => sum + t.rawPosition.x, 0) / rowTiles.length;
            const fraction = progress / 6;
            const expectedCenterX = triggerCenter + fraction * (islandCenter - triggerCenter);
            const shiftX = Math.round(expectedCenterX - currentCenterX);
            
            let archHeight = 0;
            if (progress === 1 || progress === 5) archHeight = 0.8;
            else if (progress === 2 || progress === 4) archHeight = 1.8;
            else if (progress === 3) archHeight = 2.8;

            for (const tile of rowTiles) {
                tile.rawPosition.x += shiftX;
                tile.x = (tile.rawPosition.x * Math.sqrt(3) * 1.5) + 12;
                
                this.tilesToBuild.push({
                    tile: tile,
                    archHeight: archHeight,
                    progress: progress
                });
            }
        }
        
        this.tilesToBuild.sort((a, b) => {
            if (b.tile.rawPosition.y !== a.tile.rawPosition.y) {
                return b.tile.rawPosition.y - a.tile.rawPosition.y;
            }
            return Math.random() - 0.5;
        });
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
            this.handleBackspaceInput();
            return true;
        }
        
        const key = event.key.toUpperCase();
        if (key.length === 1 && key.match(/[A-Z]/)) {
            this.handleCharacterInput(key, worldPhase);
        }
        return true; 
    }
    /**
     * Handles backspace input during the event.
     */
    handleBackspaceInput() {
        if (this.errorKey) {
            if (this.errorTimeout) clearTimeout(this.errorTimeout);
            this.errorKey = null;
            this.activeWords.forEach(w => w.errorFlash = false);
        } else {
            this.currentTyped = this.currentTyped.slice(0, -1);
            if (this.currentTyped === "") {
                this.currentWordId = null;
            }
        }
        this.updateWordDisplay();
    }
    /**
     * Handles character input during the event.
     * @param {string} key - The character to handle.
     * @param {WorldPhase} worldPhase - The current world phase.
     */
    handleCharacterInput(key, worldPhase) {
        if (this.errorKey) {
            if (this.errorTimeout) clearTimeout(this.errorTimeout);
            this.errorKey = null;
            this.activeWords.forEach(w => w.errorFlash = false);
        }

        const nextTyped = this.currentTyped + key;
        let match = null;

        if (this.currentWordId !== null) {
            match = this.activeWords.find(w => w.id === this.currentWordId && w.word.startsWith(nextTyped) && w.phase !== "completed");
        }
        if (!match) {
            match = this.activeWords.find(w => w.word.startsWith(nextTyped) && w.phase !== "completed");
        }
        
        if (match) {
            this.currentWordId = match.id;
            this.currentTyped = nextTyped;
            if (match.word === nextTyped) {
                match.phase = "completed";
                match.age = 0;
                match.opacity = 1;
                
                this.baseSpawnDelay = Math.max(0.5, this.baseSpawnDelay - 0.4);
                this.wordSpawnTimer = 0;
                
                this.currentTyped = "";
                this.currentWordId = null;
                this.completedCount++;
                this.piecesBuilt++;
                this.addBridgePiece(worldPhase);
                
                if (this.completedCount >= this.targetCompletedCount) {
                    this.finishEvent(worldPhase);
                }
            }
        } else {
            let newWordMatch = this.activeWords.find(w => w.word.startsWith(key) && w.phase !== "completed");
            if (newWordMatch) {
                this.currentWordId = newWordMatch.id;
                this.currentTyped = key;
            } else {
                this.errorKey = key;
                this.baseSpawnDelay = Math.min(5.0, this.baseSpawnDelay + 0.1);
                if (this.currentWordId !== null) {
                    const errorWord = this.activeWords.find(w => w.id === this.currentWordId);
                    if (errorWord) errorWord.errorFlash = true;
                }
                
                if (this.errorTimeout) clearTimeout(this.errorTimeout);
                this.errorTimeout = setTimeout(() => {
                    this.errorKey = null;
                    this.activeWords.forEach(w => w.errorFlash = false);
                    this.updateWordDisplay();
                }, 300);
            }
        }
        this.updateWordDisplay();
    }

    /**
     * Adds a piece to the bridge in 3D.
     * @param {WorldPhase} worldPhase
     */
    addBridgePiece(worldPhase) {
        const batchesLeft = this.targetCompletedCount - this.completedCount + 1;
        if (batchesLeft <= 0 || !this.tilesToBuild || this.tilesToBuild.length === 0) return;
        
        const tilesToTake = Math.ceil(this.tilesToBuild.length / batchesLeft);
        const tilesData = this.tilesToBuild.splice(0, tilesToTake);

        this.ensureSharedMaterials(worldPhase);

        let centerTile = null;

        for (const data of tilesData) {
            const group = this.createBridgeTileGroup(data, worldPhase);
            const tile = data.tile;
            
            if (Math.abs(tile.rawPosition.x - (worldPhase.player.x + 0.5)) < 0.1) {
                centerTile = tile;
            }

            this.animatingTiles.push({
                mesh: group,
                targetY: tile.baseY,
                currentY: tile.baseY - 15,
                archHeight: data.archHeight,
                isCenter: false,
                tile: tile,
                worldPhase: worldPhase
            });
        }
        
        for (const anim of this.animatingTiles) {
            if (anim.tile === centerTile) {
                anim.isCenter = true;
            }
        }
    }
    /**
     * Ensures the shared materials for the bridge tiles are created.
     * @param {WorldPhase} worldPhase 
     */
    ensureSharedMaterials(worldPhase) {
        if (!this.sharedSideMaterial) {
            this.sharedSideMaterial = new THREE.MeshStandardMaterial({
                map: worldPhase.worldMap.stoneTexture,
                color: 0xffffff,
                roughness: 0.8,
                metalness: 0.2,
            });
            
            this.sharedParticleMaterial = new THREE.PointsMaterial({
                color: 0xa855f7,
                size: 0.15,
                transparent: true,
                opacity: 0.8,
                blending: THREE.AdditiveBlending,
                depthWrite: false
            });
            
            this.sharedLineMaterial = new THREE.LineBasicMaterial({ color: 0x333333 });
        }
    }
    /**
     * Creates a group of meshes for a bridge tile.
     * @param {Object} data - The tile data.
     * @param {WorldPhase} worldPhase - The current world phase.
     * @returns {THREE.Group} The group of meshes.
     */
    createBridgeTileGroup(data, worldPhase) {
        const tile = data.tile;
        const archHeight = data.archHeight;
        const progress = data.progress;
        tile.isRavine = false;
        
        const group = new THREE.Group();
        
        const sideMaterial = new THREE.MeshStandardMaterial({
            map: worldPhase.worldMap.stoneTexture,
            color: 0xffffff,
            roughness: 0.8,
            metalness: 0.2,
        });
        const lineMaterial = new THREE.LineBasicMaterial({ color: 0x333333 });
        
        let thickness = 1.5;
        if (progress === 1 || progress === 5) thickness = 14.0;
        else if (progress === 2 || progress === 4) thickness = 3.0;

        const H = thickness - 0.4;
        const bodyGeometry = new THREE.CylinderGeometry(1.5, 1.5, H, 6);
        const bodyMesh = new THREE.Mesh(bodyGeometry, sideMaterial);
        bodyMesh.position.y = 1.6 - (H / 2);
        const bodyEdges = new THREE.EdgesGeometry(bodyGeometry);
        const bodyLine = new THREE.LineSegments(bodyEdges, lineMaterial);
        bodyMesh.add(bodyLine);

        const bevelGeometry = new THREE.CylinderGeometry(1.3, 1.5, 0.4, 6);
        
        let topMaterial = sideMaterial;
        if (tile.letter && worldPhase.worldMap.generateLetterTexture) {
            const tex = worldPhase.worldMap.generateLetterTexture(
                tile.letter,
                worldPhase.worldMap.stoneTexture ? worldPhase.worldMap.stoneTexture.image : null
            );
            topMaterial = new THREE.MeshStandardMaterial({
                map: tex,
                color: 0xffffff,
                roughness: 0.8,
            });
        }

        const bevelMesh = new THREE.Mesh(bevelGeometry, [
            sideMaterial,
            topMaterial,
            sideMaterial,
        ]);
        bevelMesh.position.y = 1.8;
        
        const bevelEdges = new THREE.EdgesGeometry(bevelGeometry);
        const bevelLine = new THREE.LineSegments(bevelEdges, lineMaterial);
        bevelMesh.add(bevelLine);

        group.add(bodyMesh);
        group.add(bevelMesh);

        group.material = [sideMaterial, topMaterial, sideMaterial];
        group.lineMaterial = lineMaterial;
        
        const random_z = archHeight + Math.random() * 0.4;
        tile.baseY = random_z;
        
        group.position.set(tile.x, tile.baseY - 15, tile.y);
        group.rotation.y = 0;

        worldPhase.gameEngine.scene.add(group);
        this.bridgeMeshes.push(group);

        return group;
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
        this.uiOverlay = document.createElement("div");
        this.uiOverlay.classList.add("mission-overlay");

        const instructionDisplay = document.createElement("div");
        instructionDisplay.classList.add("mission-instruction");
        instructionDisplay.innerText = "FRAPPEZ LES MOTS POUR CONSTRUIRE LE PONT !";

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
        
        const existingIds = new Set(this.activeWords.map(w => 'word-' + w.id));
        Array.from(this.wordDisplay.children).forEach(child => {
            if (!existingIds.has(child.id)) {
                child.remove();
            }
        });
        
        this.activeWords.forEach(ws => {
            let wordEl = document.getElementById('word-' + ws.id);
            if (!wordEl) {
                wordEl = document.createElement("div");
                wordEl.id = 'word-' + ws.id;
                wordEl.classList.add("mission-word");
                this.wordDisplay.appendChild(wordEl);
            }
            
            wordEl.style.left = ws.x + '%';
            wordEl.style.top = ws.y + '%';
            wordEl.style.transform = `translate(-50%, -50%) scale(${ws.scale})`;
            wordEl.style.opacity = (ws.phase === "completed") ? ws.opacity : ws.scale;
            
            this.renderWordSpans(ws, wordEl);
        });
    }
    /**
     * Renders the spans for a word.
     * @param {Object} ws - The word state.
     * @param {HTMLElement} wordEl - The word element.
     */
    renderWordSpans(ws, wordEl) {
        if (ws.phase === "completed") {
            const typedSpan = document.createElement("span");
            typedSpan.classList.add("typed");
            typedSpan.innerText = ws.word;
            wordEl.innerHTML = "";
            wordEl.appendChild(typedSpan);
        } else if (this.currentWordId === ws.id) {
            const typedSpan = document.createElement("span");
            typedSpan.classList.add("typed");
            typedSpan.innerText = this.currentTyped;
            
            wordEl.innerHTML = "";
            wordEl.appendChild(typedSpan);
            
            let remainingWord = ws.word.substring(this.currentTyped.length);
            
            if (ws.errorFlash && remainingWord.length > 0) {
                const errorSpan = document.createElement("span");
                errorSpan.classList.add("next-error");
                errorSpan.innerText = remainingWord[0];
                wordEl.appendChild(errorSpan);
                remainingWord = remainingWord.substring(1);
            }
            
            if (remainingWord.length > 0) {
                const restSpan = document.createElement("span");
                restSpan.innerText = remainingWord;
                wordEl.appendChild(restSpan);
            }
            
            wordEl.style.opacity = ws.scale; 
        } else {
            wordEl.innerHTML = "";
            const span = document.createElement("span");
            span.innerText = ws.word;
            wordEl.appendChild(span);
        }
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
