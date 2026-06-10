import { GamePhase } from "./GamePhase.js";
import * as THREE from "three";
import WorldMap from "../managers/WorldMap.js";
import Player from "../models/actors/Player.js";
import { VoidCreature } from "../models/actors/VoidCreature.js";
import { DialogueBox } from "../ui/DialogueBox.js";
import { LanguageManager } from "../../core/utils/LanguageManager.js";

export class InfiniteVoidPhase extends GamePhase {
    constructor(gameEngine, options = {}) {
        super(gameEngine);
        this.worldMap = null;
        this.player = null;
        this.camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.elapsedTime = 0;
        this.lowestYGenerated = 0;
        this.highestPlayerY = 0;
        
        this.isEncounterTriggered = false;
        this.voidCreature = null;
        this.typingMinigameActive = false;
        this.targetWord = LanguageManager.t("game.voidTargetWord");
        this.typedWord = "";
        this.isBossDefeated = false;
        this.isTransitioning = false;
        this.isCameraReturning = false;
        this.cameraReturnTime = 0;
        
        this.tab_lettre = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z"];
        this.recentlyUsed = [];
        this.isReady = false;
    }

    async init() {
        const scene = this.gameEngine.scene;
        const worldLayout = [];
        worldLayout.push({ id: "spawn", x: 1.5, y: 0, letter: null, isPressed: false, role: "spawn" });
        
        for (let i = 1; i <= 15; i++) {
            this.generateRow(worldLayout, -i);
        }
        this.lowestYGenerated = -15;

        this.worldMap = await WorldMap.init(this.gameEngine.scene, worldLayout, false);
        this.draw_bg();

        const spawnTile = this.worldMap.mapLayout.find(t => t.role === "spawn");

        this.player = new Player(
            "Héros", 100, 100,
            { x: spawnTile.rawPosition.x, y: spawnTile.rawPosition.y, z: 5 },
            { width: 0.4, height: 0.4 },
            scene, undefined, undefined,
            () => this.gameEngine.loadLevel(this.gameEngine.currentLevel),
            this.gameEngine.stats
        );
        this.player.allowSpeedUp = false;
        this.player.spacingX = Math.sqrt(3) * 1.5;
        this.player.spacingZ = 1.5 * 1.5;
        this.player.offsetX = 12;
        this.player.offsetY = 2.0 + (spawnTile.baseY || 0);
        this.player.offsetZ = 0;
        this.player.updateHpBar = () => {};
        const hudEl = document.getElementById("player-hud");
        if (hudEl) {
            hudEl.style.display = "none";
        }

        if (this.player.loadPromise) {
            await this.player.loadPromise;
        }

        this.player.offsetY = 2.0 + (spawnTile.baseY || 0);
        this.isPlayingIntro = true;
        this.introTime = 0;
        if (this.playerLight) {
            this.playerLight.intensity = 0;
        }

        this.voidCreature = new VoidCreature(this.gameEngine.scene, this.player.mesh.position);
        await this.voidCreature.init();
        this.voidCreature.mesh.position.z = this.player.mesh.position.z + 100; 

        this.waitForLoader().then(() => {
            this.isReady = true;
        });
    }

    waitForLoader() {
        return new Promise(resolve => {
            const loader = document.getElementById("global-loader");
            if (!loader) return resolve();
            
            const checkHidden = setInterval(() => {
                if (loader.classList.contains("hidden")) {
                    clearInterval(checkHidden);
                    const onEnd = () => {
                        loader.removeEventListener("transitionend", onEnd);
                        resolve();
                    };
                    loader.addEventListener("transitionend", onEnd);
                    setTimeout(() => {
                        loader.removeEventListener("transitionend", onEnd);
                        resolve();
                    }, 600); 
                }
            }, 50);
        });
    }

    generateRow(layoutArray, yIndex) {
        let test = Math.abs(yIndex) % 2 === 0 ? 1 : 0;
        let width = Math.random() < 0.1 ? 2 : (Math.random() < 0.2 ? 4 : 3);
        let min_decal = Math.abs(yIndex) % 2 === 1 ? 0.5 : 0;
        
        for (let x = 0; x < width; x++) {
            let availableLetters = this.tab_lettre.filter(l => !this.recentlyUsed.includes(l));
            if (availableLetters.length === 0) {
                availableLetters = this.tab_lettre;
                this.recentlyUsed = [];
            }
            let genere_leter = availableLetters[Math.floor(Math.random() * availableLetters.length)];
            this.recentlyUsed.push(genere_leter);
            if (this.recentlyUsed.length > 24) {
                this.recentlyUsed.shift();
            }
            
            let posX = x + min_decal + test;
            
            layoutArray.push({
                id: `inf-${posX}-${yIndex}`,
                x: posX,
                y: yIndex,
                letter: genere_leter,
                isPressed: false
            });
        }
    }

    update(deltaTime) {
        if (!this.player || !this.isReady) return;
        this.elapsedTime += deltaTime;

        if (this.isCameraReturning) {
            this.cameraReturnTime -= deltaTime;
            if (this.cameraReturnTime <= 0) {
                this.isCameraReturning = false;
            }
        }

        if (this.isPlayingIntro) {
            this.introTime += deltaTime;
            const introDuration = 3.0;
            
            if (this.introTime >= introDuration) {
                if (this.playerLight) this.playerLight.intensity = 300;
                this.isPlayingIntro = false;
            } else {
                if (this.playerLight) this.playerLight.intensity = (this.introTime / introDuration) * 300;
            }
        }

        this.player.update();

        if (this.player.mesh) {
            const playerPos = this.player.mesh.position;

            if (this.isEncounterTriggered && this.voidCreature) {
                const targetCamPos = new THREE.Vector3();
                const targetLookAt = new THREE.Vector3();
                const creaturePos = this.voidCreature.mesh.position;
                targetCamPos.set(playerPos.x + 12, playerPos.y + 12, playerPos.z - 18);
                targetLookAt.set(creaturePos.x, creaturePos.y + 3, creaturePos.z);

                this.camera.position.lerp(targetCamPos, 3 * deltaTime);

                const currentQuat = this.camera.quaternion.clone();
                this.camera.lookAt(targetLookAt);
                const targetQuat = this.camera.quaternion.clone();
                this.camera.quaternion.copy(currentQuat);
                this.camera.quaternion.slerp(targetQuat, 4 * deltaTime);
            } else if (this.isCameraReturning) {
                const targetCamPos = new THREE.Vector3(playerPos.x + 5, playerPos.y + 21, playerPos.z + 14);
                const targetLookAt = new THREE.Vector3(playerPos.x, playerPos.y, playerPos.z);

                this.camera.position.lerp(targetCamPos, 3 * deltaTime);

                const currentQuat = this.camera.quaternion.clone();
                this.camera.lookAt(targetLookAt);
                const targetQuat = this.camera.quaternion.clone();
                this.camera.quaternion.copy(currentQuat);
                this.camera.quaternion.slerp(targetQuat, 4 * deltaTime);
            } else {
                this.camera.position.set(playerPos.x + 5, playerPos.y + 21, playerPos.z + 14);
                this.camera.lookAt(playerPos.x, playerPos.y, playerPos.z);
            }
        }

        if (this.worldMap) {
            this.worldMap.update({ x: this.player.x, y: this.player.y });

            if (this.player.y < this.highestPlayerY) {
                this.highestPlayerY = this.player.y;
            }

            if (this.player.y - 15 <= this.lowestYGenerated) {
                const newTiles = [];
                this.lowestYGenerated -= 1;
                this.generateRow(newTiles, this.lowestYGenerated);
                this.worldMap.addTiles(newTiles);
            }

            if (this.elapsedTime > 2 && Math.abs(this.player.y) > 5 && !this.isEncounterTriggered && !this.isBossDefeated) {
                this.worldMap.removeTiles((tile) => tile.rawPosition.y > this.player.y + 20);
            }
        }

        if (this.voidCreature && !this.isBossDefeated) {
            if (!this.isEncounterTriggered && this.highestPlayerY < -20) {
                const followDistance = 45;
                const targetZ = this.player.mesh.position.z + followDistance;
                
                if (this.voidCreature.mesh.position.z > targetZ) {
                    this.voidCreature.mesh.position.z = targetZ;
                }
                
                this.voidCreature.mesh.position.x += (this.player.mesh.position.x - this.voidCreature.mesh.position.x) * 2 * deltaTime;

                const currentDistance = this.voidCreature.mesh.position.z - this.player.mesh.position.z;
                if (currentDistance <= 8 && !this.player.isMoving && !this.encounterTimerStarted) {
                    this.encounterTimerStarted = true;
                    setTimeout(() => {
                        this.triggerVoidEncounter();
                    }, 100);
                }
            } else if (!this.isEncounterTriggered) {
                this.voidCreature.mesh.position.z = this.player.mesh.position.z + 100;
                this.voidCreature.mesh.position.x = this.player.mesh.position.x;
            }

            this.voidCreature.update(deltaTime);
        }

        if (this.fireball && this.fireballTarget) {
            const dir = new THREE.Vector3().subVectors(this.fireballTarget, this.fireball.position);
            const dist = dir.length();
            if (dist < 1.0) {
                this.gameEngine.scene.remove(this.fireball);
                this.fireball.geometry.dispose();
                this.fireball.material.dispose();
                this.fireball = null;
                
                this.voidCreature.die();
                
                setTimeout(() => {
                    this.generateVictoryIsland();
                }, 1500);
            } else {
                dir.normalize();
                this.fireball.position.add(dir.multiplyScalar(15 * deltaTime));
            }
        }

        if (this.isBossDefeated && !this.isTransitioning) {
            const winTile = this.worldMap.mapLayout.find((t) => t.id === "island-win");
            if (winTile) {
                const dx = winTile.rawPosition.x - this.player.x;
                const dy = winTile.rawPosition.y - this.player.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < 1.5) {
                    this.showEnterPrompt();
                } else {
                    this.hideEnterPrompt();
                }
            }
        }
    }

    getGridXIndex(posX, yVal) {
        const absY = Math.abs(yVal);
        const minDecal = absY % 2 === 1 ? 0.5 : 0;
        const testVal = absY % 2 === 0 ? 1 : 0;
        return Math.round(posX - minDecal - testVal);
    }

    getPosX(xIdx, yVal) {
        const absY = Math.abs(yVal);
        const minDecal = absY % 2 === 1 ? 0.5 : 0;
        const testVal = absY % 2 === 0 ? 1 : 0;
        return xIdx + minDecal + testVal;
    }

    generateVictoryIsland() {
        this.worldMap.removeTiles((tile) => tile.rawPosition.y <= this.player.y - 1);

        const playerXIdx = this.getGridXIndex(this.player.x, this.player.y);
        const playerY = this.player.y;
        const newTiles = [];

        newTiles.push({ id: "bridge-1", x: this.getPosX(playerXIdx, playerY - 1), y: playerY - 1, letter: "1", isPressed: false });
        newTiles.push({ id: "bridge-2", x: this.getPosX(playerXIdx, playerY - 2), y: playerY - 2, letter: "2", isPressed: false });
        newTiles.push({ id: "bridge-3", x: this.getPosX(playerXIdx, playerY - 3), y: playerY - 3, letter: "3", isPressed: false });
        newTiles.push({ id: "bridge-4", x: this.getPosX(playerXIdx, playerY - 4), y: playerY - 4, letter: "4", isPressed: false });

        const islandWidths = [3, 5, 7, 5, 3];
        for (let r = 0; r < islandWidths.length; r++) {
            const yVal = playerY - 5 - r;
            const w = islandWidths[r];
            const startIdx = playerXIdx - Math.floor(w / 2);
            for (let i = 0; i < w; i++) {
                const gx = startIdx + i;
                const isCenter = gx === playerXIdx;
                if (r === 2 && isCenter) {
                    newTiles.push({
                        id: "island-win",
                        x: this.getPosX(gx, yVal),
                        y: yVal,
                        letter: null,
                        isPressed: false,
                        renderMesh: false,
                        baseY: 0
                    });
                } else {
                    let letterVal = null;
                    if (isCenter && r === 0) letterVal = "5";
                    if (isCenter && r === 1) letterVal = "6";

                    newTiles.push({
                        id: `island-${gx}-${yVal}`,
                        x: this.getPosX(gx, yVal),
                        y: yVal,
                        letter: letterVal,
                        isPressed: false
                    });
                }
            }
        }

        this.worldMap.addTiles(newTiles);

        const winTile = this.worldMap.mapLayout.find((t) => t.id === "island-win");
        if (winTile) {
            const holeGeo = new THREE.CylinderGeometry(1.3, 1.3, 15, 32);
            const holeMat = new THREE.MeshBasicMaterial({ color: 0x050508 });
            this.holeMesh = new THREE.Mesh(holeGeo, holeMat);
            this.holeMesh.position.set(winTile.position.x, -7.5, winTile.position.y);
            this.gameEngine.scene.add(this.holeMesh);
        }

        this.isBossDefeated = true;
        this.isEncounterTriggered = false;
        this.encounterTimerStarted = false;
        this.isCameraReturning = true;
        this.cameraReturnTime = 2.0;
    }

    showEnterPrompt() {
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
        titleDiv.innerText = LanguageManager.t("game.jumpIntoHole");

        this.enterPromptOverlay.appendChild(titleDiv);
        this.enterPromptOverlay.appendChild(enterKey);

        document.body.appendChild(this.enterPromptOverlay);
    }

    hideEnterPrompt() {
        if (this.enterPromptOverlay) {
            this.enterPromptOverlay.remove();
            this.enterPromptOverlay = null;
        }
    }

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

            const fallAnimationStep = (time) => {
                const elapsed = time - startTime;
                const progress = Math.min(elapsed / duration, 1);

                player.x = startX + (targetX - startX) * progress;
                player.y = startGridY + (targetGridY - startGridY) * progress;

                const yOffset = Math.sin(progress * Math.PI) * 3.0 - Math.pow(progress, 3) * 15.0;
                player.offsetY = startY + yOffset;

                const scale = Math.max(0, 1 - Math.pow(progress, 2));
                player.mesh.scale.setScalar(scale);

                if (progress < 1) {
                    requestAnimationFrame(fallAnimationStep);
                } else {
                    resolve();
                }
            };
            requestAnimationFrame(fallAnimationStep);
        });
    }

    async triggerVoidEncounter() {
        this.isEncounterTriggered = true;
        this.setupTypingUI();
        this.typingMinigameActive = true;
    }

    setupTypingUI() {
        this.typingContainer = document.createElement("div");
        this.typingContainer.className = "typing-minigame glass-panel";
        this.typingContainer.innerHTML = `
            <h2>${LanguageManager.t("game.voidTitle")}</h2>
            <div class="word-container typing-minigame-word">
            </div>
            <p>${LanguageManager.t("game.voidDescription")}</p>
        `;
        document.body.appendChild(this.typingContainer);
        this.updateTypingUI();
    }

    updateTypingUI() {
        if (!this.typingContainer) return;
        const html = this.targetWord.split("").map((char, index) => {
            const isTyped = index < this.typedWord.length;
            const extraClass = isTyped ? " typed" : "";
            return `<span class="typing-minigame-char${extraClass}">${char}</span>`;
        }).join("");
        this.typingContainer.querySelector(".typing-minigame-word").innerHTML = html;
    }

    resolveMinigame() {
        this.typingMinigameActive = false;
        if (this.typingContainer) {
            this.typingContainer.remove();
            this.typingContainer = null;
        }

        this.fireball = new THREE.Mesh(
            new THREE.SphereGeometry(0.8, 16, 16),
            new THREE.MeshBasicMaterial({ color: 0xff5500 })
        );
        this.fireball.position.copy(this.player.mesh.position);
        this.fireball.position.y += 2; 
        
        const fireballLight = new THREE.PointLight(0xff5500, 500, 50);
        this.fireball.add(fireballLight);
        this.gameEngine.scene.add(this.fireball);
        
        this.fireballTarget = this.voidCreature.mesh.position.clone();
        this.fireballTarget.y += 2;
    }

    handleKeyDown(event) {
        if (this.isPlayingIntro || !this.isReady) return;

        if (event.key.toUpperCase() === "ENTER" && this.isBossDefeated && !this.isTransitioning) {
            const winTile = this.worldMap.mapLayout.find((t) => t.id === "island-win");
            if (winTile) {
                const dx = winTile.rawPosition.x - this.player.x;
                const dy = winTile.rawPosition.y - this.player.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < 1.5) {
                    this.isTransitioning = true;
                    if (this.enterPromptOverlay) {
                        const keyElement = this.enterPromptOverlay.querySelector(".enter-prompt-key");
                        if (keyElement) keyElement.classList.add("active");
                    }
                    setTimeout(() => {
                        this.hideEnterPrompt();
                        this.animateFall(this.player, winTile).then(() => {
                            this.gameEngine.nextLevel();
                        });
                    }, 150);
                    return;
                }
            }
        }

        if (this.typingMinigameActive) {
            const key = event.key.toUpperCase();
            const expectedChar = this.targetWord[this.typedWord.length];
            
            if (key === expectedChar) {
                this.typedWord += key;
                this.updateTypingUI();
                
                if (this.typedWord === this.targetWord) {
                    this.resolveMinigame();
                }
            } else {
                this.typedWord = "";
                this.updateTypingUI();
                this.cameraShakeTime = 0.2;
            }
            return;
        }

        if (this.gameEngine.isPaused || this.encounterTimerStarted || this.isTransitioning) return;

        const keyName = event.key.toUpperCase();
        let target = this.worldMap ? this.worldMap.find(keyName, this.player.y) : null;
        
        if (target) {
            target.isPressed = true;
            this.player.move({
                x: target.rawPosition.x,
                y: target.rawPosition.y,
                offsetY: 2.0 + (target.baseY || 0)
            });
        }
    }

    draw() {
        if (this.player && this.player.mesh && this.playerLight) {
            const pos = this.player.mesh.position;
            this.playerLight.position.set(pos.x, pos.y + 7, pos.z);
        }
    }

    draw_bg() {
        this.gameEngine.scene.background = new THREE.Color(0x05050a);
        this.gameEngine.scene.fog = new THREE.Fog(0x05050a, 20, 80);

        this.ambientLight = new THREE.AmbientLight(0xffffff, 0.01);
        this.gameEngine.scene.add(this.ambientLight);

        this.playerLight = new THREE.PointLight(0xffddaa, 300, 100);
        this.playerLight.position.set(0, 7, 0);
        this.gameEngine.scene.add(this.playerLight);
    }

    cleanup() {
        if (this.typingContainer) {
            this.typingContainer.remove();
        }
        if (this.voidCreature) {
            this.voidCreature.cleanup();
        }
        if (this.player && this.player.mesh) this.gameEngine.scene.remove(this.player.mesh);
        if (this.fireball) this.gameEngine.scene.remove(this.fireball);
        if (this.worldMap) this.gameEngine.scene.remove(this.worldMap.group);
        if (this.ambientLight) this.gameEngine.scene.remove(this.ambientLight);
        if (this.playerLight) this.gameEngine.scene.remove(this.playerLight);
        if (this.holeMesh) {
            this.gameEngine.scene.remove(this.holeMesh);
            if (this.holeMesh.geometry) this.holeMesh.geometry.dispose();
            if (this.holeMesh.material) this.holeMesh.material.dispose();
            this.holeMesh = null;
        }
        if (this.enterPromptOverlay) {
            this.enterPromptOverlay.remove();
            this.enterPromptOverlay = null;
        }
    }
}
