import { GamePhase } from "./GamePhase.js";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import Enemies from "../managers/Enemies.js";
import Keyboard from "../managers/Keyboard.js";
import Player from "../models/actors/Player.js";
import Projectile from "../models/Projectile.js";
import { KEYBOARD_LAYOUT } from "../utilities/KEYBOARD.js";
import { SurviveDecorBuilder } from "../utilities/SurviveDecorBuilder.js";

const loader = new GLTFLoader();

/**
 * Represents the survive phase of the game where the player defends against enemies.
 */
export class SurvivePhase extends GamePhase {
    /**
     * Creates an instance of SurvivePhase.
     * @param {GameEngine} gameEngine - The game engine instance.
     * @param {string} decorType - The type of decor ('mine', 'styx', 'default').
     */
    constructor(gameEngine, decorType = "default") {
        super(gameEngine);
        this.decorType = decorType;
        this.decor = null;
        this.keyboard = null;
        this.player = null;
        this.enemies = null;
        this.projectiles = [];
        this.bonks = [];
        this.elCurrentWord = null;
        this.spawnTimer = 0;
        this.spawnInterval = 3;
    }

    /**
     * Initializes the survive phase, including the player, enemies, and keyboard.
     * @returns {Promise<void>}
     */
    async init() {
        const scene = this.gameEngine.scene;

        this.worldGroupPivot = new THREE.Group();
        this.worldGroupPivot.position.set(16, 0, 3.2);
        scene.add(this.worldGroupPivot);

        this.worldGroup = new THREE.Group();
        this.worldGroup.position.set(-16, 0, -3.2);
        this.worldGroupPivot.add(this.worldGroup);

        this.keyboard = Keyboard.init(this.worldGroup, KEYBOARD_LAYOUT, this.decorType);

        const enemyGltf = await loader.loadAsync("/asset/game_assets/bug.glb");
        const fireballGltf = await loader.loadAsync(
            "/asset/game_assets/fireball.glb"
        );

        this.enemies = new Enemies(
            this.keyboard.keyboardLayout,
            enemyGltf.scene,
            fireballGltf.scene
        );

        this.player = new Player(
            "Héros",
            100,
            100,
            { x: 0, y: 0, z: 5 },
            { width: 0.4, height: 0.4 },
            this.worldGroup,
            fireballGltf.scene,
            this.enemies
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
    }

    /**
     * Updates the game state for the survive phase.
     * @param {number} deltaTime - The time elapsed since the last update.
     */
    update(deltaTime) {
        this.gameEngine.camera.position.set(15, 18, 7);
        this.gameEngine.camera.lookAt(15, 0, 3);

        if (this.enemies && this.player) {
            if (this.player.isAlive()) {
                this.spawnTimer += deltaTime;
                if (this.spawnTimer >= this.spawnInterval) {
                    this.spawnTimer = 0;
                    this.spawnEnemy();
                }

                this.pathUpdateTimer = (this.pathUpdateTimer || 0) + deltaTime;
                if (this.pathUpdateTimer >= 0.5) {
                    this.pathUpdateTimer = 0;
                    if (this.lastPlayerKey) {
                        this.enemies.updatePath(this.lastPlayerKey, this.keyboard);
                    }
                }

                this.enemies.clearDead();
                this.enemies.update(
                    this.player.position,
                    this.projectiles,
                    this.bonks,
                    this.player
                );
            }
        }
        if (this.player) {
            this.player.update();
        }
        
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const p = this.projectiles[i];
            p.update(null, deltaTime * 1000);
            
            if (this.enemies && this.enemies.container) {
                for (const enemy of this.enemies.container) {
                    if (!enemy.isDead && p.checkCollision(enemy)) {
                        enemy.takeDamage(p.damage || 50);
                        p.die();
                        break;
                    }
                }
            }
            
            if (p.isDead) {
                this.projectiles.splice(i, 1);
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

    /**
     * Draws the elements of the survive phase, updating positions and states.
     */
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
    spawnEnemy() {
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
        const randomType = types[Math.floor(Math.random() * types.length)];
        
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
            const closestEnemy = this.enemies.findClosestEnemy(
                this.player.position
            );

            const spellResult = this.player.attack(word, closestEnemy);

            if (spellResult instanceof Projectile) {
                this.projectiles.push(spellResult);
            }
            if (this.elCurrentWord) {
                this.elCurrentWord.textContent = word;
                setTimeout(() => {
                    this.elCurrentWord.textContent = this.player.currentWord;
                }, 100);
            }
        } else if (this.elCurrentWord) {
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
    }
}
