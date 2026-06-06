import { WorldEvent } from "./WorldEvent.js";
import * as THREE from "three";
import { LanguageManager } from "../../core/utils/LanguageManager.js";

export class JumpWordEvent extends WorldEvent {
    constructor() {
        super();
        this.isActive = false;
        this.isCompleted = false;
        const words = LanguageManager.t("game.jumpWords");
        this.wordDictionary = Array.isArray(words) ? words : [
            "JUMP", "LEAP", "BOOST", "FLY", "SOAR", "POWER", "FORCE", "ENERGY", "LAUNCH", "SPEED", "THRUST", 
            "ACTION", "HEIGHT", "FLIGHT", "VELOCITY", "MOMENTUM", "DYNAMICS", "IMPULSE", "SPRINT", "GRAVITY", 
            "VIGOR", "BOUNCE", "CHARGE", "STRENGTH"
        ];
        this.activeWords = [];
        this.baseSpawnDelay = 3.0;
        this.wordSpawnTimer = 0;
        this.nextWordId = 0;
        this.targetCompletedCount = 10;
        this.completedCount = 0;
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
        this.gaugeFillEl = null;
        this.gaugeTextEl = null;

        this.triggerX = 0;
        this.triggerY = 0;
        this.triggerTileIds = new Set();

        this.isJumping = false;
        this.jumpProgress = 0;
        this.jumpDuration = 1.8;
    }

    get cssFiles() {
        return ["/asset/css/bridgeEvent.css"];
    }

    modifyLayout(mapLayout) {
        mapLayout.forEach(tile => {
            if (tile.y <= -15 && tile.y > -20) {
                tile.renderMesh = false;
                tile.letter = null;
            }
            if (tile.y === -14) {
                this.triggerTileIds.add(tile.id);
            }
        });
    }

    async init(worldPhase, scene) {}

    update(worldPhase, deltaTime) {
        if (!worldPhase.player || !worldPhase.worldMap) return;

        if (this.isCompleted) return;

        if (this.transitioningToEvent) {
            this.handleCameraTransition(worldPhase, deltaTime, true);
            return;
        }

        if (this.transitioningToWorld) {
            this.handleCameraTransition(worldPhase, deltaTime, false);
            return;
        }

        if (this.isJumping) {
            this.updateJump(worldPhase, deltaTime);
            return;
        }

        if (this.isLanding) {
            this.updateLanding(worldPhase, deltaTime);
            return;
        }

        if (this.isActive) {
            if (this.isWaitingToJump) {
                this.waitTimer -= deltaTime;
                worldPhase.player.applyCrouch(1.0);
                
                const maxShake = 0.5;
                const shakeX = (Math.random() - 0.5) * maxShake;
                const shakeY = (Math.random() - 0.5) * maxShake;
                const shakeZ = (Math.random() - 0.5) * maxShake;
                
                worldPhase.camera.position.set(
                    this.eventCameraPos.x + shakeX,
                    this.eventCameraPos.y + shakeY,
                    this.eventCameraPos.z + shakeZ
                );
                worldPhase.camera.lookAt(this.eventCameraLookAt);

                if (this.waitTimer <= 0) {
                    this.isWaitingToJump = false;
                    this.isActive = false;
                    this.triggerJumpSequence(worldPhase);
                }
                return;
            }

            const percentage = this.completedCount / this.targetCompletedCount;
            
            worldPhase.player.applyCrouch(percentage);
            
            let shakeX = 0, shakeY = 0, shakeZ = 0;
            if (percentage > 0.33) {
                const shakeIntensity = (percentage - 0.33) / 0.67;
                const maxShake = 0.5 * shakeIntensity;
                shakeX = (Math.random() - 0.5) * maxShake;
                shakeY = (Math.random() - 0.5) * maxShake;
                shakeZ = (Math.random() - 0.5) * maxShake;
            }
            
            worldPhase.camera.position.set(
                this.eventCameraPos.x + shakeX,
                this.eventCameraPos.y + shakeY,
                this.eventCameraPos.z + shakeZ
            );
            worldPhase.camera.lookAt(this.eventCameraLookAt);
            
            this.updateWordLifecycle(deltaTime);
            return;
        }

        this.checkJumpTrigger(worldPhase);
    }

    checkJumpTrigger(worldPhase) {
        if (!this.triggerTileIds || this.triggerTileIds.size === 0) return;

        const currentTile = worldPhase.worldMap.mapLayout.find(t =>
            Math.abs(t.rawPosition.x - worldPhase.player.x) < 0.1 &&
            Math.abs(t.rawPosition.y - worldPhase.player.y) < 0.1
        );

        if (currentTile && this.triggerTileIds.has(currentTile.id)) {
            if (!this.isActive && !this.transitioningToEvent) {
                this.triggerX = currentTile.rawPosition.x;
                this.triggerY = currentTile.rawPosition.y;
                this.startEvent(worldPhase);
            }
        }
    }

    startEvent(worldPhase) {
        worldPhase.isTransitioning = true;
        this.transitioningToEvent = true;
        this.transitionProgress = 0;

        const playerPos = worldPhase.player.mesh.position;
        this.startCameraPos.copy(worldPhase.camera.position);
        this.startCameraLookAt.copy(playerPos);

        const triggerRow = worldPhase.worldMap.mapLayout.filter(t => t.rawPosition.y === this.triggerY);
        const islandRow = worldPhase.worldMap.mapLayout.filter(t => t.rawPosition.y === this.triggerY - 6);

        let triggerCenter = 0;
        if (triggerRow.length > 0) {
            triggerCenter = triggerRow.reduce((sum, t) => sum + t.rawPosition.x, 0) / triggerRow.length;
        }

        let islandCenter = 0;
        if (islandRow.length > 0) {
            islandCenter = islandRow.reduce((sum, t) => sum + t.rawPosition.x, 0) / islandRow.length;
        }

        const startX = (triggerCenter * Math.sqrt(3) * 1.5) + 12;
        const startZ = this.triggerY * 2.25;

        const endX = (islandCenter * Math.sqrt(3) * 1.5) + 12;
        const endZ = (this.triggerY - 6) * 2.25;

        const jumpWorldX = (startX + endX) / 2;
        const jumpWorldZ = (startZ + endZ) / 2;

        const dirX = endX - startX;
        const dirZ = endZ - startZ;
        const length = Math.sqrt(dirX * dirX + dirZ * dirZ);

        const perpX = -dirZ / length;
        const perpZ = dirX / length;

        const distance = 18;
        this.eventCameraPos = new THREE.Vector3(
            jumpWorldX + perpX * distance,
            14,
            jumpWorldZ + perpZ * distance
        );
        this.eventCameraLookAt = new THREE.Vector3(
            jumpWorldX,
            2,
            jumpWorldZ
        );
    }

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

        const startP = intoEvent ? this.startCameraPos : (this.startTransitionOutPos || this.eventCameraPos);
        const startL = intoEvent ? this.startCameraLookAt : (this.startTransitionOutLookAt || this.eventCameraLookAt);
        
        let targetP, targetL;
        if (intoEvent) {
            targetP = this.eventCameraPos;
            targetL = this.eventCameraLookAt;
        } else {
            const playerPos = worldPhase.player.mesh.position;
            targetP = new THREE.Vector3(playerPos.x + 5, playerPos.y + 21, playerPos.z + 14);
            targetL = playerPos.clone();
        }

        worldPhase.camera.position.lerpVectors(startP, targetP, ease);
        const currentLookAt = new THREE.Vector3().lerpVectors(startL, targetL, ease);
        worldPhase.camera.lookAt(currentLookAt);
    }

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
                const wordEl = document.getElementById("word-" + w.id);
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
                this.updateGaugeUI();

                if (this.completedCount >= this.targetCompletedCount) {
                    if (!this.isWaitingToJump) {
                        this.isWaitingToJump = true;
                        this.waitTimer = 0.5;
                        this.activeWords = [];
                        this.updateWordDisplay();
                    }
                }
            }
        } else {
            const newWordMatch = this.activeWords.find(w => w.word.startsWith(key) && w.phase !== "completed");
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

    buildUI() {
        this.uiOverlay = document.createElement("div");
        this.uiOverlay.classList.add("mission-overlay");

        const instructionDisplay = document.createElement("div");
        instructionDisplay.classList.add("mission-instruction");
        instructionDisplay.innerText = LanguageManager.t("game.jumpInstruction");

        const gaugeWrapper = document.createElement("div");
        gaugeWrapper.classList.add("jump-gauge-wrapper");

        const gaugeTitle = document.createElement("div");
        gaugeTitle.classList.add("jump-gauge-title");
        gaugeTitle.innerText = LanguageManager.t("game.jumpPowerTitle");

        const gaugeContainer = document.createElement("div");
        gaugeContainer.classList.add("jump-gauge-container");

        this.gaugeFillEl = document.createElement("div");
        this.gaugeFillEl.classList.add("jump-gauge-fill");

        this.gaugeTextEl = document.createElement("div");
        this.gaugeTextEl.classList.add("jump-gauge-text");
        this.gaugeTextEl.innerText = "0%";

        gaugeContainer.appendChild(this.gaugeFillEl);
        gaugeContainer.appendChild(this.gaugeTextEl);

        gaugeWrapper.appendChild(gaugeTitle);
        gaugeWrapper.appendChild(gaugeContainer);

        this.wordDisplay = document.createElement("div");
        this.wordDisplay.classList.add("mission-word-container");

        this.uiOverlay.appendChild(instructionDisplay);
        this.uiOverlay.appendChild(gaugeWrapper);
        this.uiOverlay.appendChild(this.wordDisplay);
        document.body.appendChild(this.uiOverlay);

        this.updateWordDisplay();
        this.updateGaugeUI();
    }

    updateGaugeUI() {
        if (!this.gaugeFillEl || !this.gaugeTextEl) return;
        const percentage = Math.min(100, Math.floor((this.completedCount / this.targetCompletedCount) * 100));
        this.gaugeFillEl.style.height = percentage + "%";
        this.gaugeTextEl.innerText = `${percentage}%`;

        const hue = 120 - (percentage * 1.2); 
        this.gaugeFillEl.style.background = `hsl(${hue}, 80%, 50%)`;
        this.gaugeFillEl.style.boxShadow = `0 0 10px hsla(${hue}, 80%, 50%, 0.5)`;

        if (percentage >= 100) {
            this.gaugeFillEl.parentElement.classList.add("full");
        }
    }

    updateWordDisplay() {
        if (!this.wordDisplay) return;

        const existingIds = new Set(this.activeWords.map(w => "word-" + w.id));
        Array.from(this.wordDisplay.children).forEach(child => {
            if (!existingIds.has(child.id)) {
                child.remove();
            }
        });

        this.activeWords.forEach(ws => {
            let wordEl = document.getElementById("word-" + ws.id);
            if (!wordEl) {
                wordEl = document.createElement("div");
                wordEl.id = "word-" + ws.id;
                wordEl.classList.add("mission-word");
                this.wordDisplay.appendChild(wordEl);
            }

            wordEl.style.left = ws.x + "%";
            wordEl.style.top = ws.y + "%";
            wordEl.style.transform = `translate(-50%, -50%) scale(${ws.scale})`;
            wordEl.style.opacity = (ws.phase === "completed") ? ws.opacity : ws.scale;

            this.renderWordSpans(ws, wordEl);
        });
    }

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

    triggerJumpSequence(worldPhase) {
        if (this.uiOverlay) {
            this.uiOverlay.remove();
            this.uiOverlay = null;
        }
        this.isActive = false;

        const player = worldPhase.player;
        const worldMap = worldPhase.worldMap;

        const triggerRow = worldMap.mapLayout.filter(t => t.rawPosition.y === this.triggerY);
        const islandRow = worldMap.mapLayout.filter(t => t.rawPosition.y === this.triggerY - 6);

        let triggerCenter = 0;
        if (triggerRow.length > 0) {
            triggerCenter = triggerRow.reduce((sum, t) => sum + t.rawPosition.x, 0) / triggerRow.length;
        }

        let islandCenter = 0;
        if (islandRow.length > 0) {
            islandCenter = islandRow.reduce((sum, t) => sum + t.rawPosition.x, 0) / islandRow.length;
        }

        const triggerTile = worldMap.mapLayout.find(t =>
            Math.abs(t.rawPosition.x - triggerCenter) < 1.0 &&
            t.rawPosition.y === this.triggerY
        ) || triggerRow[0];

        const targetTile = worldMap.mapLayout.find(t =>
            Math.abs(t.rawPosition.x - islandCenter) < 1.0 &&
            t.rawPosition.y === this.triggerY - 6
        ) || islandRow[0];

        const spacingX = player.spacingX;
        const spacingZ = player.spacingZ;
        const offsetX = player.offsetX;
        const offsetZ = player.offsetZ;

        this.jumpStartX = triggerTile.rawPosition.x * spacingX + offsetX;
        this.jumpStartCenterZ = triggerTile.rawPosition.y * spacingZ + offsetZ;
        this.jumpStartY = player.offsetY;

        this.jumpTargetX = targetTile.rawPosition.x * spacingX + offsetX;
        this.jumpTargetCenterZ = targetTile.rawPosition.y * spacingZ + offsetZ;
        this.jumpTargetY = targetTile.baseY + 2.0;

        this.targetTileLogicalX = targetTile.rawPosition.x;
        this.targetTileLogicalY = targetTile.rawPosition.y;

        this.isJumping = true;
        this.jumpProgress = 0;

        player.jumpSound.currentTime = 0;
        player.jumpSound.volume = 0.8;
        player.jumpSound.play().catch(() => {});
    }

    updateJump(worldPhase, deltaTime) {
        const player = worldPhase.player;
        this.jumpProgress += deltaTime / this.jumpDuration;

        if (this.jumpProgress >= 1) {
            this.jumpProgress = 1;
            this.isJumping = false;

            player.x = this.targetTileLogicalX;
            player.y = this.targetTileLogicalY;
            player.offsetY = this.jumpTargetY;
            player.mesh.position.set(this.jumpTargetX, this.jumpTargetY, this.jumpTargetCenterZ);

            const finalCameraPos = new THREE.Vector3(
                this.jumpTargetX + 5,
                this.jumpTargetY + 21,
                this.jumpTargetCenterZ + 14
            );
            worldPhase.camera.position.copy(finalCameraPos);
            worldPhase.camera.lookAt(this.jumpTargetX, this.jumpTargetY, this.jumpTargetCenterZ);

            worldPhase.player.applyCrouch(1.0);
            
            window.startShake(1.5);
            worldPhase.cameraShakeTime = 0.4;
            
            player.jumpSound.currentTime = 0;
            player.jumpSound.volume = 0.8;
            player.jumpSound.play().catch(() => {});

            this.isLanding = true;
            this.landingProgress = 0;
        } else {
            const t = this.jumpProgress;
            const ease = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

            const currentX = this.jumpStartX + (this.jumpTargetX - this.jumpStartX) * ease;
            const currentZ = this.jumpStartCenterZ + (this.jumpTargetCenterZ - this.jumpStartCenterZ) * ease;
            const currentY = this.jumpStartY + (this.jumpTargetY - this.jumpStartY) * ease + Math.sin(ease * Math.PI) * 12.0;

            player.offsetY = currentY;
            player.mesh.position.set(currentX, currentY, currentZ);

            let crouchPercentage = 0;
            if (t < 0.2) {
                crouchPercentage = 1.0 - (t / 0.2);
            }
            worldPhase.player.applyCrouch(crouchPercentage);

            const finalCameraPos = new THREE.Vector3(
                this.jumpTargetX + 5,
                this.jumpTargetY + 21,
                this.jumpTargetCenterZ + 14
            );
            const finalCameraLookAt = new THREE.Vector3(
                this.jumpTargetX,
                this.jumpTargetY,
                this.jumpTargetCenterZ
            );

            worldPhase.camera.position.lerpVectors(this.eventCameraPos, finalCameraPos, ease);
            
            const currentLook = new THREE.Vector3().lerpVectors(this.eventCameraLookAt, finalCameraLookAt, ease);
            worldPhase.camera.lookAt(currentLook);
        }
    }

    updateLanding(worldPhase, deltaTime) {
        this.landingProgress += deltaTime / 0.8;
        if (this.landingProgress >= 1.0) {
            this.isLanding = false;
            this.isCompleted = true;
            worldPhase.isTransitioning = false;
            worldPhase.player.playerModel.scale.set(1.95, 1.95, 1.95);
            return;
        }
        
        let percentage = 1.0;
        if (this.landingProgress >= 0.625) {
            percentage = 1.0 - (this.landingProgress - 0.625) / 0.375;
        }
        worldPhase.player.applyCrouch(percentage);
    }

    cleanup(worldPhase) {
        if (this.uiOverlay) {
            this.uiOverlay.remove();
        }
        const style = document.getElementById("bridge-event-styles");
        if (style) style.remove();
    }
}
