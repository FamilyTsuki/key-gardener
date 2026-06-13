import Actor from "../Actor.js";
import Undefined from "../spells/Undefined.js";
import * as THREE from "three";
import ModelLoader from "../../../core/utils/ModelLoader.js";
import ProjectileLuncher from "../spells/ProjectileLuncher.js";
import HealSpell from "../spells/HealSpells.js";
import FireCircle from "../spells/FireCircle.js";
import { AudioManager } from "../../managers/AudioManager.js";

/**
 * Player class representing the main character in the game.
 * Inherits from Actor.
 */
export default class Player extends Actor {
    /** @type {Array<Spell>} */
    #wordSpells;
    /** @type {string} */
    #currentWord = "";

    /**
     * Constructs a Player instance.
     * @param {string} [playerName="Unknown"] - The name of the player.
     * @param {number} [hp=100] - The health points of the player.
     * @param {number} [hpMax=100] - The maximum health points of the player.
     * @param {Object} rawPosition - The raw initial position {x, y, z}.
     * @param {Object} size - The size of the player {width, height}.
     * @param {THREE.Scene} scene - The scene where the player will be added.
     * @param {THREE.Group} fireballModel - The 3D model for fireballs.
     * @param {Object} enemiesManager - The manager handling enemies.
     */
    constructor(
        playerName = "Unknown",
        hp = 100,
        hpMax = 100,
        rawPosition,
        size,
        scene,
        fireballModel,
        enemiesManager,
        onDeath = null,
        statsManager = null
    ) {
        const position = {
            x: rawPosition.x,
            y: rawPosition.y,
            z: rawPosition.z,
        };

        super(playerName, hp, hpMax, rawPosition, position, size);

        this.#wordSpells = [
            new Undefined(),
            new FireCircle("fire", 1, 2.3, 9000, scene, this, enemiesManager),
            new ProjectileLuncher("wasa", 100, 10000, fireballModel),
            new ProjectileLuncher("pok", 35, 10000, fireballModel),
            new HealSpell("heal", 30),
        ];

        this.onDeath = onDeath;
        this.statsManager = statsManager;

        this.targetPosition = { x: position.x, y: position.y, z: position.z };
        this.startPosition = { x: position.x, y: position.y };

        this.isMoving = false;
        this.movementProgress = 0;
        this.facingDirection = { x: 0, y: -1 };
        this.movementDuration = 15;
        this.currentMovementTime = 0;
        this.lastKeyPressTime = 0;
        this.allowSpeedUp = true;

        this.spacingX = 3.2;
        this.spacingZ = 3.2;
        this.offsetX = 0;
        this.offsetY = 0;
        this.offsetZ = 0;
        this.startOffsetY = 0;
        this.targetOffsetY = 0;

        this.mesh = new THREE.Group();
        this.scene = scene;
        scene.add(this.mesh);

        const initialAngle = Math.atan2(
            this.facingDirection.x * this.spacingX,
            this.facingDirection.y * this.spacingZ
        );
        this.mesh.rotation.set(0, initialAngle, 0);

        this.updatePosition();

        this.fireballModel = fireballModel;
        this.playerModel = null;



        this.loadPromise = ModelLoader.loadAsync("/asset/game_assets/models/player.glb").then((gltf) => {
            const rawModel = gltf.scene;
            
            const box = new THREE.Box3().setFromObject(rawModel);
            const center = box.getCenter(new THREE.Vector3());
            
            rawModel.position.x = -center.x;
            rawModel.position.z = -center.z;
            
            this.playerModel = new THREE.Group();
            this.playerModel.add(rawModel);

            rawModel.traverse((child) => {
                if (child.isBone) {
                    child.userData.initialPosition = child.position.clone();
                    child.userData.initialRotation = child.rotation.clone();
                }
            });

            this.playerModel.scale.set(1.95, 1.95, 1.95);
            this.playerModel.position.y = 0;
            this.mesh.add(this.playerModel);
        });

        this.elVignette = document.getElementById("damage-vignette");
        
        this.lastHp = this.hp;
        this.updateHpBar();
    }

    /**
     * Updates the health bar visual representation.
     */
    updateHpBar() {
        const fillEl = document.getElementById("player-hp-fill");
        const currentEl = document.getElementById("player-hp-current");
        const maxEl = document.getElementById("player-hp-max");
        const separatorNode = maxEl ? maxEl.previousSibling : null;

        const hudEl = document.getElementById("player-hud");

        if (this.hp === Infinity) {
            if (hudEl) hudEl.style.display = "none";
            return;
        }

        if (hudEl) hudEl.style.display = "flex";

        if (fillEl && currentEl && maxEl) {
            const ratio = Math.max(0, this.hp / this.hpMax);
            currentEl.textContent = Math.ceil(Math.max(0, this.hp));
            maxEl.textContent = this.hpMax;
            if (separatorNode && separatorNode.nodeType === Node.TEXT_NODE) {
                separatorNode.textContent = " / ";
            }
            fillEl.style.width = `${ratio * 100}%`;
            
            if (ratio > 0.3) {
                fillEl.classList.remove("low-hp");
                fillEl.classList.add("high-hp");
            } else {
                fillEl.classList.remove("high-hp");
                fillEl.classList.add("low-hp");
            }
        }
    }

    /**
     * Cleans up the player object and hides UI.
     */
    destroy() {
        const hudEl = document.getElementById("player-hud");
        if (hudEl) hudEl.style.display = "none";
        
        const gameOverScreen = document.getElementById("game-over-screen");
        if (gameOverScreen) {
            gameOverScreen.remove();
        }

        if (typeof super.destroy === "function") {
            super.destroy();
        }
    }

    /**
     * Gets the list of trigger words for the player's spells.
     * @returns {Array<string>} The array of trigger words.
     */
    get wordSpells() {
        return this.#wordSpells.map((wordSpell) => wordSpell.word);
    }

    /**
     * Gets the current word being typed by the player.
     * @returns {string} The current word.
     */
    get currentWord() {
        return this.#currentWord;
    }

    /**
     * Attacks by casting a spell corresponding to the provided word.
     * @param {string} word - The trigger word of the spell.
     * @param {Enemy|null} [closestEnemy=null] - The closest enemy targeted.
     * @returns {any} The effect result of the spell.
     * @throws {Error} If no spell corresponds to the word.
     */
    attack(word, closestEnemy = null) {
        const spell = this.#wordSpells.find(
            (wordSpell) => wordSpell.word === word
        );

        if (!spell) {
            throw new Error("There is no spell related to that word.");
        }

        return spell.effect(closestEnemy, this, this.scene);
    }

    /**
     * Initiates movement towards a new position.
     * @param {Object} newPosition - The target position {x, y, z, offsetY}.
     */
    move(newPosition, keyboardLayout = null) {
        if (
            this.targetPosition.x !== newPosition.x ||
            this.targetPosition.y !== newPosition.y
        ) {
            const now = Date.now();
            const timeSinceLastPress = now - (this.lastKeyPressTime || 0);
            this.lastKeyPressTime = now;

            if (this.allowSpeedUp && timeSinceLastPress < 300) {
                this.movementDuration = Math.max(3, this.movementDuration * 0.4);
            } else {
                this.movementDuration = 15;
            }

            this.startPosition = { x: this.x, y: this.y };
            
            const dx = newPosition.x - this.targetPosition.x;
            const dy = newPosition.y - this.targetPosition.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist > 0) {
                this.facingDirection = { x: dx / dist, y: dy / dist };
            }
            
            this.targetPosition = newPosition;

            this.startOffsetY = this.offsetY;
            if (newPosition.offsetY !== undefined) {
                this.targetOffsetY = newPosition.offsetY;
            } else {
                const targetKey = keyboardLayout ? keyboardLayout.find(k => 
                    Math.abs(k.rawPosition.x - newPosition.x) < 0.1 && 
                    Math.abs(k.rawPosition.y - newPosition.y) < 0.1
                ) : null;
                if (targetKey) {
                    this.targetOffsetY = this.getTileSurfaceHeight(targetKey);
                } else {
                    this.targetOffsetY = this.offsetY;
                }
            }

            this.isMoving = true;
            this.currentMovementTime = 0;

            if (this.mesh) {
                const angle = Math.atan2(
                    this.facingDirection.x * this.spacingX,
                    this.facingDirection.y * this.spacingZ
                );
                this.mesh.rotation.set(0, angle, 0);
            }

            AudioManager.playSFX("/asset/game_assets/sounds/jump.wav", "player", 0.5);
        }
    }

    showGameOverScreen() {
        const canvas = document.getElementById("game-canvas");
        if (canvas) canvas.classList.add("player-dead");

        const screen = document.createElement("div");
        screen.id = "game-over-screen";

        const banner = document.createElement("div");
        banner.className = "div-title";

        const title = document.createElement("h1");
        title.className = "game-over-title";
        title.textContent = "Vous êtes mort.";

        const reason = document.createElement("p");
        reason.className = "game-over-reason";
        reason.textContent = this.deathReason || "Cause inconnue.";

        banner.appendChild(title);
        banner.appendChild(reason);
        screen.appendChild(banner);
        document.body.appendChild(screen);

        setTimeout(() => {
            const el = document.getElementById("game-over-screen");
            const c = document.getElementById("game-canvas");

            if (el) el.classList.add("fading-out");
            if (c) {
                c.classList.remove("player-dead");
                c.classList.add("player-restarting");
            }

            setTimeout(() => {
                if (el) el.remove();
                if (c) c.classList.remove("player-restarting");

                if (this.onDeath) {
                    this.onDeath();
                }
            }, 1200);
        }, 8000);
    }

    /**
     * Updates the player's state, spells, and position each frame.
     */
    update(deltaTime = 0.0166, keyboardLayout = null) {
        if (!this.isAlive()) {
            if (!this.deathAnimationPlayed) {
                if (this.playerModel) {
                    this.playerModel.rotation.x = -Math.PI / 2;
                    this.playerModel.position.y = 0.5;
                    this.playerModel.scale.set(1.95, 1.95, 1.95);
                }
                if (this.hpSprite) this.hpSprite.visible = false;
                this.deathAnimationPlayed = true;

                this.showGameOverScreen();
            }
            return;
        }

        this.#wordSpells.forEach((spell) => {
            if (spell.update) {
                spell.update(16.6);
            }
        });

        if (this.lastHp !== this.hp) {
            this.updateHpBar();
            this.lastHp = this.hp;
        }

        this.lastX = this.x;
        this.lastY = this.y;

        if (this.isMoving) {
            this.currentMovementTime += deltaTime;
            this.movementProgress =
                this.currentMovementTime / (this.movementDuration * 0.0166);

            if (this.movementProgress >= 1) {
                this.movementProgress = 1;
                this.isMoving = false;
                this.x = this.targetPosition.x;
                this.y = this.targetPosition.y;

                AudioManager.playSFX("/asset/game_assets/sounds/fall.wav", "player", 0.4);
            } else {
                this.x =
                    this.startPosition.x +
                    (this.targetPosition.x - this.startPosition.x) *
                        this.movementProgress;
                this.y =
                    this.startPosition.y +
                    (this.targetPosition.y - this.startPosition.y) *
                        this.movementProgress;
            }
            
            this.offsetY = 
                this.startOffsetY + 
                (this.targetOffsetY - this.startOffsetY) * this.movementProgress;
        }

        if (this.mesh) {
            if (!this.isMoving && keyboardLayout) {
                const currentKey = keyboardLayout.find(k => 
                    Math.abs(k.rawPosition.x - this.x) < 0.1 && 
                    Math.abs(k.rawPosition.y - this.y) < 0.1
                );
                if (currentKey) {
                    this.offsetY = this.getTileSurfaceHeight(currentKey);
                }
            }

            this.updatePosition();

            if (this.playerModel) {
                if (this.isMoving) {
                    const jumpAmplitude = 2.0;
                    this.playerModel.position.y =
                        0 +
                        Math.sin(this.movementProgress * Math.PI) * jumpAmplitude;

                    const dx = this.targetPosition.x - this.startPosition.x;
                    const dy = this.targetPosition.y - this.startPosition.y;
                    const jumpDistance = Math.sqrt(dx * dx + dy * dy);
                    
                    const maxTilt = Math.min(jumpDistance * 0.1, 0.6);
                    
                    this.playerModel.rotation.x = Math.sin(this.movementProgress * Math.PI) * maxTilt; 

                    const speedFactor = 15 / this.movementDuration;
                    const maxStretchZ = Math.max(1, speedFactor * 0.6);
                    const stretchFactor = 1 + (maxStretchZ - 1) * Math.sin(this.movementProgress * Math.PI);
                    const shrinkFactor = 1.95 / Math.sqrt(stretchFactor);
                    this.playerModel.scale.set(shrinkFactor, shrinkFactor, 1.95 * stretchFactor);
                } else {
                    this.playerModel.position.y = 0;
                    this.playerModel.rotation.x = 0;
                    this.playerModel.scale.set(1.95, 1.95, 1.95);

                    this.playerModel.traverse((child) => {
                        if (child.isBone && child.userData.initialRotation) {
                            child.position.copy(child.userData.initialPosition);
                            child.rotation.copy(child.userData.initialRotation);
                        }
                    });
                }

                if (this.hpSprite) {
                    this.hpSprite.position.y = this.playerModel.position.y + 1.65;
                }
            }
        }
    }

    /**
     * Updates the mesh's physical position in the 3D world based on current logical coordinates.
     */
    updatePosition() {
        if (this.mesh) {
            const worldCurrentX = this.x * this.spacingX + this.offsetX;
            const worldCurrentZ = this.y * this.spacingZ + this.offsetZ;
            this.mesh.position.set(worldCurrentX, this.offsetY, worldCurrentZ);
        }
    }

    /**
     * Applies a procedural crouch animation to the player rig.
     * @param {number} percentage - From 0.0 (standing) to 1.0 (fully crouched)
     */
    applyCrouch(percentage) {
        const model = this.playerModel;
        if (!model) return;
        
        const hips = model.getObjectByName("Hips") || model.getObjectByName("mixamorigHips");
        const leftUpLeg = model.getObjectByName("LeftUpLeg") || model.getObjectByName("mixamorigLeftUpLeg");
        const rightUpLeg = model.getObjectByName("RightUpLeg") || model.getObjectByName("mixamorigRightUpLeg");
        const leftLeg = model.getObjectByName("LeftLeg") || model.getObjectByName("mixamorigLeftLeg");
        const rightLeg = model.getObjectByName("RightLeg") || model.getObjectByName("mixamorigRightLeg");
        const spine = model.getObjectByName("Spine") || model.getObjectByName("mixamorigSpine");

        if (hips && leftUpLeg && rightUpLeg && leftLeg && rightLeg && hips.userData.initialPosition) {
            model.scale.set(1.95, 1.95, 1.95);
            hips.position.y = hips.userData.initialPosition.y * (1 - percentage * 0.6);
            leftUpLeg.rotation.x = leftUpLeg.userData.initialRotation.x - percentage * 1.5;
            rightUpLeg.rotation.x = rightUpLeg.userData.initialRotation.x - percentage * 1.5;
            leftLeg.rotation.x = leftLeg.userData.initialRotation.x + percentage * 2.2;
            rightLeg.rotation.x = rightLeg.userData.initialRotation.x + percentage * 2.2;
            if (spine) {
                spine.rotation.x = spine.userData.initialRotation.x + percentage * 0.6;
            }
        } else {
            const squashY = 1.95 - (percentage * 1.05);
            const stretchXZ = 1.95 + (percentage * 0.6);
            model.scale.set(stretchXZ, squashY, stretchXZ);
        }
    }

    /**
     * Applies damage to the player.
     * @param {number} amount - The amount of damage to apply.
     * @param {string} [reason] - Human-readable cause of the damage.
     */
    damage(amount, reason = null) {
        this.hp -= amount;

        if (this.mesh && this.mesh.position) {
            window.dispatchEvent(new CustomEvent("spawn_floating_text", {
                detail: {
                    position: this.mesh.position,
                    text: `-${Math.round(amount)}`,
                    type: "damage-taken"
                }
            }));
        }

        if (reason && this.hp <= 0) {
            this.deathReason = reason;
        }
        AudioManager.playSFX("/asset/game_assets/sounds/ouch.wav", "player", 0.5);

        if (this.elVignette) {
            this.elVignette.classList.add("flash-red");

            setTimeout(() => {
                this.elVignette.classList.remove("flash-red");
            }, 500);
        }
    }

    /**
     * Heals the player.
     * @param {number} amount - The amount to heal.
     */
    heal(amount) {
        if (this.hp < this.hpMax) {
            const healAmount = Math.min(amount, this.hpMax - this.hp);
            this.hp += healAmount;

            if (this.mesh && this.mesh.position) {
                window.dispatchEvent(new CustomEvent("spawn_floating_text", {
                    detail: {
                        position: this.mesh.position,
                        text: `+${Math.round(healAmount)}`,
                        type: "heal"
                    }
                }));
            }
        }
    }

    /**
     * Handles key press events for typing spell words.
     * @param {string} key - The key pressed.
     * @param {Function} findClosestEnemy - Function to find the closest enemy.
     * @returns {string|boolean} The completed spell word or false.
     */
    handleKeyPress(key, findClosestEnemy) {
        let keyProcessed = false;
        if (key.length === 1 && key.match(/[a-z]/i)) {
            this.#currentWord += key.toLowerCase();
            keyProcessed = true;
        } else if (key === "Backspace") {
            this.#currentWord = this.#currentWord.slice(0, -1);
        }

        const isValidPrefix = this.#wordSpells.some((spell) =>
            spell.word.startsWith(this.#currentWord)
        );

        if (!isValidPrefix) {
            this.#currentWord = "";
            if (keyProcessed && this.statsManager) this.statsManager.recordKeystroke(false);
        } else {
            if (keyProcessed && this.statsManager) this.statsManager.recordKeystroke(true);
            const completeSpell = this.#wordSpells.find(
                (spell) => spell.word === this.#currentWord
            );
            if (completeSpell) {
                this.#currentWord = "";
                if (this.statsManager) this.statsManager.recordWordTyped();
                return completeSpell.word;
            }
        }

        return false;
    }

    /**
     * Gets the instances of the player's spells.
     * @returns {Array<Spell>} The array of spell instances.
     */
    get wordSpellsInstances() {
        return this.#wordSpells;
    }

    getTileSurfaceHeight(keyObj) {
        if (!keyObj || !keyObj.mesh) return 0.225;

        const keyGroup = keyObj.mesh;
        const targetMesh = keyObj.isGround ? keyGroup.children[0] : keyGroup.children[1];
        let height = keyGroup.position.y;

        if (targetMesh && targetMesh.geometry) {
            if (!targetMesh.geometry.boundingBox) {
                targetMesh.geometry.computeBoundingBox();
            }
            const bbox = targetMesh.geometry.boundingBox;
            const halfHeight = (bbox.max.y - bbox.min.y) / 2;
            height += halfHeight * targetMesh.scale.y;
        } else {
            height += keyObj.isGround ? 0.2 : 0.225;
        }

        return height + 0.05;
    }
}
