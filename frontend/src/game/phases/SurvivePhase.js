import { GamePhase } from "./GamePhase.js";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import Enemies from "../managers/Enemies.js";
import Keyboard from "../managers/Keyboard.js";
import Player from "../models/actors/Player.js";
import Projectile from "../models/Projectile.js";
import { KEYBOARD_LAYOUT } from "../utilities/KEYBOARD.js";
import { SurviveDecorBuilder } from "../utilities/SurviveDecorBuilder.js";
import { DialogueBox } from "../ui/DialogueBox.js";

const loader = new GLTFLoader();

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
        } else {
            this.decorType = options.decorType || "default";
            this.duration = options.duration !== undefined ? options.duration : 60;
            this.spawnInterval = options.spawnInterval !== undefined ? options.spawnInterval : null;
            this.maxEnemies = options.maxEnemies !== undefined ? options.maxEnemies : 0;
            this.storyEvents = (options.storyEvents || []).map(evt => ({ ...evt, isTriggered: false }));
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
    }

    async init() {
        const scene = this.gameEngine.scene;

        this.worldGroupPivot = new THREE.Group();
        this.worldGroupPivot.position.set(16, 0, 3.2);
        scene.add(this.worldGroupPivot);

        this.worldGroup = new THREE.Group();
        this.worldGroup.position.set(-16, 0, -3.2);
        this.worldGroupPivot.add(this.worldGroup);

        this.keyboard = Keyboard.init(this.worldGroup, KEYBOARD_LAYOUT, this.decorType);

        const enemyGltf = await loader.loadAsync("/asset/game_assets/models/bug.glb");
        const fireballGltf = await loader.loadAsync(
            "/asset/game_assets/models/fireball.glb"
        );

        this.enemies = new Enemies(
            this.keyboard.keyboardLayout,
            enemyGltf.scene,
            fireballGltf.scene
        );

        this.player = new Player(
            "Héros",
            this.options.playerHp === null ? Infinity : (this.options.playerHp || 100),
            this.options.playerHp === null ? Infinity : (this.options.playerHp || 100),
            { x: 0, y: 0, z: 5 },
            { width: 0.4, height: 0.4 },
            this.worldGroup,
            fireballGltf.scene,
            this.enemies,
            () => this.gameEngine.loadLevel(this.gameEngine.currentLevel)
        );
        this.lastPlayerKey = "A";
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

        this.decor = SurviveDecorBuilder.buildDecor(this.decorType, scene);

        if (this.options && this.options.boss) {
            await this.enemies.spawnBoss(this.worldGroup);
        }
    }

    executeEventAction(eventToTrigger) {
        if (eventToTrigger.actionType === "heal") {
            if (this.player) {
                this.player.heal(eventToTrigger.healAmount || 50);
            }
        } else if (eventToTrigger.actionType === "spawn") {
            this.spawnEnemy(eventToTrigger.enemyType || eventToTrigger.spawnEnemy || "basic"); 
        } else if (eventToTrigger.actionType === "spawnBoss") {
            if (this.enemies) {
                this.enemies.spawnBoss(this.worldGroup);
            }
        } else if (eventToTrigger.actionType === "spawnerConfig") {
            this.spawnInterval = eventToTrigger.spawnInterval !== undefined ? eventToTrigger.spawnInterval : 3;
            this.maxEnemies = eventToTrigger.maxEnemies !== undefined ? eventToTrigger.maxEnemies : 20;
            console.log(`[SurvivePhase] Spawner Config Updated: interval=${this.spawnInterval}, max=${this.maxEnemies}`);
        }
    }

    update(deltaTime) {
        if (this.isPhaseEnded) return;

        if (this.enemies && this.enemies.boss && this.enemies.boss.isDead) {
            const bossUI = document.getElementById("boss-ui");
            if (bossUI) {
                bossUI.classList.add("hidden");
            }
            
            this.isPhaseEnded = true;
            this.gameEngine.nextLevel();
            return;
        }

        this.gameEngine.camera.position.set(15, 18, 7);
        this.gameEngine.camera.lookAt(15, 0, 3);

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
                if (this.spawnInterval !== null && this.spawnInterval !== undefined && this.spawnInterval > 0) {
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
            this.player.update();
            
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

            this.keyboard.update();
        }

    }

    /**
     * Spawns a new random enemy on a random key (avoiding the player's current key).
     */
    spawnEnemy(type = null) {
        if (!this.keyboard || !this.enemies) return;

        const keys = this.keyboard.keyboardLayout;
        let randomKey;
        let attempts = 0;
        let dist = 1000;
        
        do {
            randomKey = keys[Math.floor(Math.random() * keys.length)];
            attempts++;
            
            if (this.player) {
                const dx = randomKey.rawPosition.x - this.player.x;
                const dy = randomKey.rawPosition.y - this.player.y;
                dist = Math.sqrt(dx * dx + dy * dy);
            }
        } while (
            dist < 2 &&
            attempts < 20
        );

        const types = ["basic", "speedy", "tank"];
        let randomType = type || types[Math.floor(Math.random() * types.length)];
        if (!types.includes(randomType)) {
            randomType = "basic";
        }
        
        this.enemies.spawnAt(randomKey, this.worldGroup, randomType);
        
        if (this.lastPlayerKey) {
            this.enemies.updatePath(this.lastPlayerKey, this.keyboard);
        }
    }

    /**
     * Handles keyboard events for movement and attacking.
     * @param {KeyboardEvent} event - The keyboard event.
     */
    handleKeyDown(event) {
        if (!this.player || !this.player.isAlive()) return;

        const keyName = event.key.toUpperCase();
        const target = this.keyboard?.find(keyName);
        if (!target) {
            return;
        }

        target.isPressed = true;
        this.lastPlayerKey = target.key;

        if (this.player && this.enemies) {
            this.player.move({
                x: target.rawPosition.x,
                y: target.rawPosition.y,
            });
        }
        let word = this.player.handleKeyPress(event.key);

        if (word) {
            this.pendingSpell = word;
        } else if (this.elCurrentWord && !this.pendingSpell) {
            this.elCurrentWord.textContent = this.player.currentWord;
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
    }
}
