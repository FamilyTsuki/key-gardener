import { GamePhase } from "./GamePhase.js";
import * as THREE from "three";
import ModelLoader from "../../core/utils/ModelLoader.js";
import Enemies from "../managers/Enemies.js";
import Keyboard from "../managers/Keyboard.js";
import Player from "../models/actors/Player.js";
import Projectile from "../models/Projectile.js";
import { getKeyboardLayout, getExtendedMapLayout } from "../utilities/KEYBOARD.js";
import { SurviveDecorBuilder } from "../utilities/SurviveDecorBuilder.js";
import { DialogueBox } from "../ui/DialogueBox.js";
import { ENEMY_TYPES } from "../constants/EnemyTypes.js";



export class SurvivePhase extends GamePhase {
    constructor(gameEngine, options = {}) {
        super(gameEngine);
        this.options = options;
        
        if (typeof options === "string") {
            this.decorType = options;
            this.duration = 60;
            this.spawnInterval = 3;
            this.maxEnemies = Infinity;
            this.storyEvents = [];
            this.spawnerActive = true;
            this.spawnerTime = 0;
            this.spawnerEnemiesSpawned = 0;
            this.spawnerKills = 0;
            this.spawnerEndCondition = "none";
            this.spawnerDuration = null;
            this.spawnerSpawnLimit = null;
            this.spawnerKillTarget = null;
        } else {
            this.decorType = options.decorType || "default";
            this.duration = options.duration !== undefined ? options.duration : 60;
            this.spawnInterval = options.spawnInterval !== undefined ? options.spawnInterval : null;
            this.maxEnemies = options.maxEnemies !== undefined ? options.maxEnemies : 0;
            this.storyEvents = (options.storyEvents || []).map(evt => ({ ...evt, isTriggered: false }));
            this.spawnerActive = options.spawnInterval !== undefined && options.spawnInterval !== null && options.spawnInterval > 0;
            this.spawnerTime = 0;
            this.spawnerEnemiesSpawned = 0;
            this.spawnerKills = 0;
            this.spawnerEndCondition = options.spawnerEndCondition || "none";
            this.spawnerDuration = options.spawnerDuration !== undefined && options.spawnerDuration !== null ? options.spawnerDuration : null;
            this.spawnerSpawnLimit = options.spawnerSpawnLimit !== undefined && options.spawnerSpawnLimit !== null ? options.spawnerSpawnLimit : null;
            this.spawnerKillTarget = options.spawnerKillTarget !== undefined && options.spawnerKillTarget !== null ? options.spawnerKillTarget : null;
        }

        this.decor = null;
        this.keyboard = null;
        this.player = null;
        this.enemies = null;
        this.projectiles = [];
        this.bonks = [];
        this.elCurrentWord = null;
        this.spawnTimer = 0;
        this.survivalTime = 0;
        this.isPhaseEnded = false;
        this.enemiesKilled = 0;
        this.isTransitioningToNextLevel = false;
        this.isReady = false;
    }

    async init() {
        const scene = this.gameEngine.scene;
        
        this.gameEngine.camera.position.set(15, 18, 7);
        this.gameEngine.camera.lookAt(15, 0, 3);

        this.worldGroupPivot = new THREE.Group();
        this.worldGroupPivot.position.set(16, 0, 3.2);
        scene.add(this.worldGroupPivot);

        this.worldGroup = new THREE.Group();
        this.worldGroup.position.set(-16, 0, -3.2);
        this.worldGroupPivot.add(this.worldGroup);

        const padSides = this.options.paddingSides !== undefined ? this.options.paddingSides : 3;
        const padTB = this.options.paddingTopBottom !== undefined ? this.options.paddingTopBottom : 5;
        this.keyboard = Keyboard.init(this.worldGroup, getExtendedMapLayout(padSides, padTB), this.decorType);

        const [enemyGltf, riggedGltf, fireballGltf] = await Promise.all([
            ModelLoader.loadAsync("/asset/game_assets/models/bug.glb"),
            ModelLoader.loadAsync("/asset/game_assets/models/bug_2.glb"),
            ModelLoader.loadAsync("/asset/game_assets/models/fireball.glb"),
        ]);

        const riggedModels = new Map();
        riggedModels.set("rigged", riggedGltf);

        this.enemies = new Enemies(
            this.keyboard.keyboardLayout,
            enemyGltf.scene,
            fireballGltf.scene,
            riggedModels
        );

        this.lastPlayerKey = "A";
        this.player = new Player(
            "Héros",
            this.options.playerHp === null ? Infinity : (this.options.playerHp || 100),
            this.options.playerHp === null ? Infinity : (this.options.playerHp || 100),
            { x: 0, y: 0, z: 5 },
            { width: 0.4, height: 0.4 },
            this.worldGroup,
            fireballGltf.scene,
            this.enemies,
            () => this.gameEngine.loadLevel(this.gameEngine.currentLevel),
            this.gameEngine.stats
        );
        const spawnTile = this.keyboard.find(this.lastPlayerKey) || this.keyboard.keyboardLayout[0];
        this.player.offsetY = this.player.getTileSurfaceHeight(spawnTile);
        this.player.updatePosition();
        this.elCurrentWord = document.getElementById("currentWord");
        document
            .getElementById("currentWord")
            .parentElement.classList.remove("none");

        const spellListContainer = document.getElementById("spell-list-container");
        if (spellListContainer && this.player) {
            spellListContainer.innerHTML = "";
            const spells = this.player.wordSpells.filter(w => w && w !== "");
            
            const title = document.createElement("h3");
            title.textContent = "Sorts disponibles :";
            spellListContainer.appendChild(title);
            
            const ul = document.createElement("ul");
            spells.forEach(spell => {
                const li = document.createElement("li");
                li.textContent = spell;
                ul.appendChild(li);
            });
            spellListContainer.appendChild(ul);
            spellListContainer.classList.remove("none");
        }

        this.settingsListener = (e) => {
            const padSides = this.options.paddingSides !== undefined ? this.options.paddingSides : 0;
            const padTB = this.options.paddingTopBottom !== undefined ? this.options.paddingTopBottom : 0;
            this.updateLayout(padSides, padTB);
        };
        window.addEventListener("settings_updated", this.settingsListener);

        this.decor = SurviveDecorBuilder.buildDecor(this.decorType, scene);

        if (this.options && this.options.boss) {
            await this.enemies.spawnBoss(this.worldGroup);
        }

        if (this.options && this.options.bugBoss) {
            await this.enemies.spawnBugBoss(this.worldGroup);
        }

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

    updateLayout(padSides, padTB) {
        if (!this.keyboard || !this.keyboard.rebuild) return;

        this.keyboard.rebuild(getExtendedMapLayout(padSides, padTB));
        
        if (this.player) {
            const pPos = this.player.targetPosition || this.player.rawPosition;
            if (pPos) {
                const newKeyAtPlayerPos = this.keyboard.keyboardLayout.find(
                    k => k.rawPosition.x === pPos.x && k.rawPosition.y === pPos.y
                );
                if (newKeyAtPlayerPos) {
                    this.lastPlayerKey = newKeyAtPlayerPos.key;
                }
            }
        }

        if (this.enemies) {
            for (const enemy of this.enemies.container) {
                if (enemy.name !== "Octopus" && enemy.name !== "GiantBug" && enemy) {
                    const ePos = enemy.targetedPosition || enemy.rawPosition;
                    if (ePos) {
                        const newKeyAtEnemyTarget = this.keyboard.keyboardLayout.find(
                            k => k.rawPosition.x === ePos.x && k.rawPosition.y === ePos.y
                        );
                        if (newKeyAtEnemyTarget) {
                            enemy.actualKey = newKeyAtEnemyTarget.key;
                        }
                    }
                }
            }

            this.enemies.keyboardLayout = this.keyboard.keyboardLayout;
            this.enemies.rebuildGrid(this.keyboard.keyboardLayout);
        }
    }

    executeEventAction(eventToTrigger) {
        if (eventToTrigger.actionType === "heal") {
            if (this.player) {
                this.player.heal(eventToTrigger.healAmount || 50);
            }
        } else if (eventToTrigger.actionType === "spawn") {
            const count = eventToTrigger.spawnCount !== undefined ? eventToTrigger.spawnCount : 1;
            const enemyType = eventToTrigger.enemyType || eventToTrigger.spawnEnemy || "basic";
            for (let i = 0; i < count; i++) {
                this.spawnEnemy(enemyType, eventToTrigger);
            } 
        } else if (eventToTrigger.actionType === "spawnBoss") {
            if (this.enemies) {
                const bossType = eventToTrigger.bossType || "octopus";
                if (bossType === "giant_bug") {
                    this.enemies.spawnBugBoss(this.worldGroup);
                } else {
                    this.enemies.spawnBoss(this.worldGroup);
                }
            }
        } else if (eventToTrigger.actionType === "spawnerConfig") {
            this.spawnInterval = eventToTrigger.spawnInterval !== undefined ? eventToTrigger.spawnInterval : 3;
            this.maxEnemies = eventToTrigger.maxEnemies !== undefined ? eventToTrigger.maxEnemies : 20;
            this.spawnerActive = true;
            this.spawnerTime = 0;
            this.spawnerEnemiesSpawned = 0;
            this.spawnerKills = 0;
            this.spawnerEndCondition = eventToTrigger.spawnerEndCondition || "none";
            this.spawnerDuration = eventToTrigger.spawnerDuration !== undefined && eventToTrigger.spawnerDuration !== null ? eventToTrigger.spawnerDuration : null;
            this.spawnerSpawnLimit = eventToTrigger.spawnerSpawnLimit !== undefined && eventToTrigger.spawnerSpawnLimit !== null ? eventToTrigger.spawnerSpawnLimit : null;
            this.spawnerKillTarget = eventToTrigger.spawnerKillTarget !== undefined && eventToTrigger.spawnerKillTarget !== null ? eventToTrigger.spawnerKillTarget : null;
            if (eventToTrigger.minSpawnDistance !== undefined) {
                this.options.minSpawnDistance = eventToTrigger.minSpawnDistance;
            }
            if (eventToTrigger.maxSpawnDistance !== undefined) {
                this.options.maxSpawnDistance = eventToTrigger.maxSpawnDistance;
            }
            if (eventToTrigger.enemyWeights !== undefined) {
                this.options.enemyWeights = eventToTrigger.enemyWeights;
            }
            console.log(`[SurvivePhase] Spawner Config Updated: interval=${this.spawnInterval}, max=${this.maxEnemies}`);
        } else if (eventToTrigger.actionType === "expandMap") {
            this.options.paddingSides = eventToTrigger.padSides !== undefined ? eventToTrigger.padSides : 3;
            this.options.paddingTopBottom = eventToTrigger.padTB !== undefined ? eventToTrigger.padTB : 5;
            this.updateLayout(this.options.paddingSides, this.options.paddingTopBottom);
            console.log(`[SurvivePhase] Map Expanded: paddingSides=${this.options.paddingSides}, paddingTopBottom=${this.options.paddingTopBottom}`);
        }
    }

    triggerPhaseTransition() {
        this.isTransitioningToNextLevel = true;

        const overlay = document.createElement("div");
        overlay.classList.add("phase-transition-overlay");
        document.body.appendChild(overlay);

        setTimeout(() => {
            overlay.classList.add("active");
            
            setTimeout(async () => {
                this.isPhaseEnded = true;
                await this.gameEngine.nextLevel();
                
                overlay.classList.remove("active");
                
                setTimeout(() => {
                    overlay.remove();
                }, 1000);
            }, 1000);
        }, 2000);
    }

    update(deltaTime) {
        if (this.isPhaseEnded || !this.isReady) return;

        if (this.enemies && this.enemies.boss && this.enemies.boss.isDead && !this.isTransitioningToNextLevel) {
            if (this.gameEngine.stats && !this.bossDeathRecorded) {
                this.gameEngine.stats.recordEnemyDefeated(true);
                this.bossDeathRecorded = true;
            }
            const bossUI = document.getElementById("boss-ui");
            if (bossUI) {
                bossUI.classList.add("hidden");
            }
            
            this.triggerPhaseTransition();
            return;
        }

        const hasBugBoss = this.enemies && this.enemies.boss && this.enemies.boss.name === "GiantBug" && !this.enemies.boss.isDead;
        const targetCamY = hasBugBoss ? 20 : 18;
        const targetCamZ = hasBugBoss ? 14 : 7;
        const targetLookY = hasBugBoss ? 3 : 0;

        const currentCamPos = this.gameEngine.camera.position;
        currentCamPos.set(
            15,
            THREE.MathUtils.lerp(currentCamPos.y, targetCamY, 0.03),
            THREE.MathUtils.lerp(currentCamPos.z, targetCamZ, 0.03)
        );
        this.gameEngine.camera.lookAt(15, targetLookY, 3);

        this.survivalTime += deltaTime;

        if (this.duration !== null) {
            if (this.survivalTime >= this.duration) {
                if (!this.enemies || !this.enemies.boss) {
                    this.isPhaseEnded = true;
                    this.gameEngine.nextLevel();
                    return;
                }
            }
        }

        if (this.spawnerActive) {
            this.spawnerTime += deltaTime;
            let shouldStopSpawner = false;
            if (this.spawnerEndCondition === "time" && this.spawnerDuration !== null) {
                shouldStopSpawner = this.spawnerTime >= this.spawnerDuration;
            } else if (this.spawnerEndCondition === "spawn_count" && this.spawnerSpawnLimit !== null) {
                shouldStopSpawner = this.spawnerEnemiesSpawned >= this.spawnerSpawnLimit;
            } else if (this.spawnerEndCondition === "kills" && this.spawnerKillTarget !== null) {
                shouldStopSpawner = this.spawnerKills >= this.spawnerKillTarget;
            }

            if (shouldStopSpawner) {
                this.spawnerActive = false;
                console.log("[SurvivePhase] Spawner stopped due to end condition");
            }
        }

        if (this.storyEvents) {
            const eventToTrigger = this.storyEvents.find(evt => {
                if (evt.isTriggered) return false;
                if (evt.triggerType === "time") {
                    return this.survivalTime >= evt.triggerValue;
                }
                if (evt.triggerType === "enemiesKilled") {
                    return this.enemiesKilled >= evt.triggerValue;
                }
                return false;
            });

            if (eventToTrigger) {
                eventToTrigger.isTriggered = true;
                
                if (eventToTrigger.dialogue && eventToTrigger.dialogue.length > 0 && !(eventToTrigger.dialogue.length === 1 && eventToTrigger.dialogue[0] === 'Hello!')) {
                    this.gameEngine.isPaused = true;
                    const dBox = new DialogueBox();
                    dBox.show(eventToTrigger.dialogue, eventToTrigger.dialogueModel || "/asset/game_assets/models/player.glb", () => {
                        dBox.destroy();
                        this.gameEngine.isPaused = false;
                        this.executeEventAction(eventToTrigger);
                    });
                    return; 
                } else {
                    this.executeEventAction(eventToTrigger);
                }
            }
        }

        if (this.enemies && this.player) {
            if (this.player.isAlive()) {
                if (this.spawnerActive && this.spawnInterval !== null && this.spawnInterval !== undefined && this.spawnInterval > 0 && !this.isTransitioningToNextLevel) {
                    this.spawnTimer += deltaTime;
                    if (this.spawnTimer >= this.spawnInterval) {
                        const regularEnemiesCount = this.enemies.container.filter(e => e !== this.enemies.boss).length;
                        if (regularEnemiesCount < this.maxEnemies) {
                            this.spawnTimer = 0;
                            this.spawnEnemy();
                        }
                    }
                }

                this.pathUpdateTimer = (this.pathUpdateTimer || 0) + deltaTime;
                if (this.pathUpdateTimer >= 0.5) {
                    this.pathUpdateTimer = 0;
                    if (this.lastPlayerKey) {
                        this.enemies.updatePath(this.lastPlayerKey, this.keyboard);
                    }
                }

                const deadCount = this.enemies.clearDead() || 0;
                this.enemiesKilled += deadCount;
                if (this.spawnerActive) {
                    this.spawnerKills += deadCount;
                }
                if (deadCount > 0 && this.gameEngine.stats) {
                    for (let i = 0; i < deadCount; i++) {
                        this.gameEngine.stats.recordEnemyDefeated(false);
                    }
                }

                this.enemies.update(
                    this.player.position,
                    this.projectiles,
                    this.bonks,
                    this.player,
                    deltaTime
                );
            }
        }
        if (this.player) {
            this.player.update(deltaTime, this.keyboard ? this.keyboard.keyboardLayout : null);
            
            const pTarget = this.player.targetPosition;
            if (pTarget && this.keyboard) {
                const actualKeyObj = this.keyboard.keyboardLayout.find(
                    k => Math.abs(k.rawPosition.x - pTarget.x) < 0.1 && Math.abs(k.rawPosition.y - pTarget.y) < 0.1
                );
                if (actualKeyObj) {
                    this.lastPlayerKey = actualKeyObj.key;
                }
            }
            
            if (this.pendingSpell && !this.player.isMoving) {
                const closestEnemy = this.enemies.findClosestEnemy(
                    this.player.position
                );

                const spellResult = this.player.attack(this.pendingSpell, closestEnemy);

                if (spellResult instanceof Projectile) {
                    this.projectiles.push(spellResult);
                }
                
                if (this.elCurrentWord) {
                    this.elCurrentWord.textContent = this.pendingSpell;
                    setTimeout(() => {
                        if (this.elCurrentWord) {
                            this.elCurrentWord.textContent = this.player.currentWord;
                        }
                    }, 100);
                }
                
                this.pendingSpell = null;
            }
        }
        
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const p = this.projectiles[i];
            p.update(null, deltaTime * 1000);
            
            if (p.team === "player") {
                if (this.enemies && this.enemies.container) {
                    for (const enemy of this.enemies.container) {
                        if (!enemy.isDead && !enemy.isSpawning && (enemy.model || enemy.mesh) && p.checkCollision(enemy)) {
                            enemy.takeDamage(p.damage || 50);
                            p.die();
                            break;
                        }
                    }
                }
            } else {
                if (this.player && this.player.isAlive() && p.checkCollision(this.player)) {
                    this.player.damage(p.damage || 10, "Touché par une boule de feu du boss");
                    p.die();
                }
            }
            
            if (p.position && (Math.abs(p.position.x) > 50 || Math.abs(p.position.y) > 50)) {
                p.die();
            }
            
            if (p.isDead) {
                this.projectiles.splice(i, 1);
            }
        }

        for (let i = this.bonks.length - 1; i >= 0; i--) {
            const bonk = this.bonks[i];
            bonk.update(deltaTime * 1000, this.player);
            
            if (bonk.isDead) {
                this.bonks.splice(i, 1);
            }
        }

        if (this.decor) {
            const waveData = this.decor.update(deltaTime) || { y: 0, rotationX: 0, rotationZ: 0 };
            if (this.worldGroupPivot) {
                if (typeof waveData === 'number') {
                    this.worldGroupPivot.position.y = waveData;
                } else {
                    this.worldGroupPivot.position.y = waveData.y;
                    this.worldGroupPivot.rotation.x = waveData.rotationX;
                    this.worldGroupPivot.rotation.z = waveData.rotationZ;
                }
            }
        }
    }

    draw() {
        if (this.keyboard && this.player) {
            this.keyboard.keyboardLayout.forEach((tile) => {
                const isPlayerOnTile =
                    this.player.targetPosition.x === tile.rawPosition.x &&
                    this.player.targetPosition.y === tile.rawPosition.y &&
                    this.player.isAlive();

                tile.isPressed = isPlayerOnTile;
            });

            this.keyboard.update(this.enemies);
        }

    }

    /**
     * Spawns a new random enemy on a random key (avoiding the player's current key).
     */
    spawnEnemy(type = null, options = {}) {
        if (!this.keyboard || !this.enemies) return;

        const keys = this.keyboard.keyboardLayout;
        let minSpawnDist = options.minSpawnDistance !== undefined ? options.minSpawnDistance : 
                             (this.options.minSpawnDistance !== undefined ? this.options.minSpawnDistance : 
                             (this.options.spawnDistance !== undefined ? this.options.spawnDistance : 5));
        let maxSpawnDist = options.maxSpawnDistance !== undefined ? options.maxSpawnDistance : 
                             (this.options.maxSpawnDistance !== undefined ? this.options.maxSpawnDistance : 999);
        
        let maxMapDist = 0;
        if (this.player) {
            for (const key of keys) {
                const dx = key.rawPosition.x - this.player.x;
                const dy = key.rawPosition.y - this.player.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist > maxMapDist) {
                    maxMapDist = dist;
                }
            }
        }

        if (maxMapDist > 0) {
            maxSpawnDist = Math.min(maxSpawnDist, maxMapDist);
            minSpawnDist = Math.min(minSpawnDist, maxMapDist * 0.7);
        }

        let randomType = type;
        if (!randomType || randomType === "random") {
            const hasGroundTiles = keys.some(k => k.isGround);
            const weights = { ...this.options.enemyWeights };
            if (!hasGroundTiles) {
                delete weights.sniper;
            }
            const activeWeights = {};
            let totalWeight = 0;
            for (const key of Object.keys(ENEMY_TYPES)) {
                if (!hasGroundTiles && key === "sniper") continue;
                const weight = weights[key] !== undefined ? Number(weights[key]) : 0;
                if (weight > 0) {
                    activeWeights[key] = weight;
                    totalWeight += weight;
                }
            }

            if (totalWeight > 0) {
                let randomNum = Math.random() * totalWeight;
                for (const [key, weight] of Object.entries(activeWeights)) {
                    if (randomNum < weight) {
                        randomType = key;
                        break;
                    }
                    randomNum -= weight;
                }
            } else {
                const enemyKeys = Object.keys(ENEMY_TYPES).filter(k => hasGroundTiles || k !== "sniper");
                randomType = enemyKeys[Math.floor(Math.random() * enemyKeys.length)];
            }
        }

        if (!ENEMY_TYPES[randomType]) {
            randomType = "basic";
        }

        const typeAllowedKeys = keys.filter(key => {
            if (randomType === "sniper") {
                return key.isGround;
            }
            if (randomType === "blocker_worm" || randomType === "hazard_worm") {
                return !key.isGround;
            }
            return key.isGround || minSpawnDist === 0;
        });

        if (typeAllowedKeys.length === 0) return;

        let candidates = typeAllowedKeys.filter(key => {
            const isOccupied = this.enemies.container.some(enemy => 
                enemy.actualKey === key.key || 
                (enemy.targetedPosition && 
                 enemy.targetedPosition.x === key.rawPosition.x && 
                 enemy.targetedPosition.y === key.rawPosition.y) ||
                (enemy.path && enemy.path.length > 0 && enemy.path[0].key === key.key)
            );
            if (isOccupied) return false;

            const isPlayerTile = this.player && (
                key.key === this.lastPlayerKey ||
                (this.player.targetPosition && 
                 this.player.targetPosition.x === key.rawPosition.x && 
                 this.player.targetPosition.y === key.rawPosition.y)
            );
            if (isPlayerTile) return false;

            return true;
        });

        if (candidates.length === 0) return;

        if (randomType !== "blocker_worm" && randomType !== "hazard_worm" && this.player) {
            const distCandidates = candidates.filter(key => {
                const dx = key.rawPosition.x - this.player.x;
                const dy = key.rawPosition.y - this.player.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                return dist >= minSpawnDist && dist <= maxSpawnDist;
            });
            if (distCandidates.length > 0) {
                candidates = distCandidates;
            }
        }

        const randomKey = candidates[Math.floor(Math.random() * candidates.length)];

        if (randomKey) {
            this.enemies.spawnAt(randomKey, this.worldGroup, randomType, options);
            if (this.spawnerActive) {
                this.spawnerEnemiesSpawned++;
            }
        }

        if (this.lastPlayerKey) {
            this.enemies.updatePath(this.lastPlayerKey, this.keyboard);
        }
    }

    /**
     * Handles keyboard events for movement and attacking.
     * @param {KeyboardEvent} event - The keyboard event.
     */
    handleKeyDown(event) {
        if (!this.player || !this.player.isAlive() || this.isTransitioningToNextLevel || !this.isReady) return;

        const keyName = event.key.toUpperCase();
        const target = this.keyboard?.find(keyName);
        if (!target) {
            return;
        }

        this.lastPlayerKey = target.key;

        let moveResult = { blocked: false };
        if (this.player && this.enemies) {
            moveResult = this.player.move({
                x: target.rawPosition.x,
                y: target.rawPosition.y,
            }, this.keyboard ? this.keyboard.keyboardLayout : null);
        }

        let allowed = true;
        if (moveResult && moveResult.blocked) {
            if (moveResult.wormKey.key === target.key && moveResult.hitWorm.type === "hazard_worm") {
                allowed = true;
            } else {
                allowed = false;
            }
        }

        if (allowed) {
            target.isPressed = true;
            
            let word = this.player.handleKeyPress(event.key);
            if (word) {
                this.pendingSpell = word;
            } else if (this.elCurrentWord && !this.pendingSpell) {
                this.elCurrentWord.textContent = this.player.currentWord;
            }
        }
    }

    /**
     * Cleans up resources used by the survive phase.
     */
    cleanup() {
        if (this.keyboard && this.worldGroup) {
            this.worldGroup.remove(this.keyboard.group);
        }
        if (this.player && this.player.mesh && this.worldGroup) {
            this.worldGroup.remove(this.player.mesh);
        }
        if (this.worldGroupPivot) {
            this.gameEngine.scene.remove(this.worldGroupPivot);
        }
        if (this.decor) {
            this.decor.cleanup();
        }
        const spellListContainer = document.getElementById("spell-list-container");
        if (spellListContainer) {
            spellListContainer.classList.add("none");
            spellListContainer.innerHTML = "";
        }
        const bossUI = document.getElementById("boss-ui");
        if (bossUI) {
            bossUI.classList.add("hidden");
        }
        if (this.settingsListener) {
            window.removeEventListener("settings_updated", this.settingsListener);
        }
    }
}
