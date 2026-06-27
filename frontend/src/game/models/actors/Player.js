import * as THREE from "three";
import Actor from "../Actor.js";
import { PlayerState } from "./player/PlayerState.js";
import { PlayerMovement } from "./player/PlayerMovement.js";
import { PlayerSpells } from "./player/PlayerSpells.js";
import { PlayerRenderer3D } from "./player/PlayerRenderer3D.js";
import { PlayerUI } from "./player/PlayerUI.js";
import { AudioManager } from "../../managers/AudioManager.js";
import { LanguageManager } from "../../../core/utils/LanguageManager.js";

export default class Player extends Actor {
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
        statsManager = null,
        unlockedSpells = []
    ) {
        const position = { x: rawPosition.x, y: rawPosition.y, z: rawPosition.z };
        super(playerName, hp, hpMax, rawPosition, position, size);

        this.scene = scene;
        this.enemiesManager = enemiesManager;
        this.onDeath = onDeath;

        this.state = new PlayerState({ playerName, hp, hpMax, statsManager });
        this.state.on("hp_changed", (data) => this.handleHpChanged(data));

        this.spells = new PlayerSpells(statsManager);
        this.spells.initialize(scene, this, enemiesManager, fireballModel, unlockedSpells);

        this.movement = new PlayerMovement(position);
        
        Object.defineProperty(this, "position", {
            get: () => {
                return {
                    x: this.movement.x,
                    y: this.movement.y,
                    z: this.movement.targetPosition ? this.movement.targetPosition.z : 0
                };
            },
            configurable: true,
            enumerable: true
        });

        Object.defineProperty(this, "rawPosition", {
            get: () => {
                return {
                    x: this.movement.x,
                    y: this.movement.y
                };
            },
            configurable: true,
            enumerable: true
        });
        
        this.renderer = new PlayerRenderer3D(scene, 3.2, 3.2);
        this.renderer.updateRotation(this.movement.facingDirection);
        this.renderer.updatePosition(this.movement);
        
        this.loadPromise = this.renderer.loadModel();

        this.ui = new PlayerUI();
        this.ui.updateHpBar(this.state.hp, this.state.hpMax);
        this.lastHp = this.state.hp;

        this.shieldEnergy = 0;
        this.shieldMesh = null;
    }

    /**
     * Retrieves the hp.
     */
    get hp() { return this.state.hp; }

    /**
     * Sets the hp.
     * @param {any} val - The val.
     */
    set hp(val) { this.state.hp = val; }

    /**
     * Retrieves the hp max.
     */
    get hpMax() { return this.state.hpMax; }

    /**
     * Retrieves the word spells.
     */
    get wordSpells() { return this.spells.getWordSpells(); }

    /**
     * Retrieves the word spells instances.
     */
    get wordSpellsInstances() { return this.spells.getWordSpellsInstances(); }

    /**
     * Retrieves the current word.
     */
    get currentWord() { return this.spells.currentWord; }

    /**
     * Retrieves the is moving.
     */
    get isMoving() { return this.movement.isMoving; }
    
    /**
     * Retrieves the x.
     */
    get x() { return this.movement.x; }

    /**
     * Retrieves the y.
     */
    get y() { return this.movement.y; }

    /**
     * Sets the x.
     * @param {any} val - The val.
     */
    set x(val) { this.movement.x = val; }

    /**
     * Sets the y.
     * @param {any} val - The val.
     */
    set y(val) { this.movement.y = val; }
    
    /**
     * Retrieves the position.
     */
    get position() {
        return {
            x: this.movement.x,
            y: this.movement.y,
            z: this.movement.targetPosition ? this.movement.targetPosition.z : 0
        };
    }
    
    /**
     * Retrieves the target position.
     */
    get targetPosition() { return this.movement.targetPosition; }

    /**
     * Retrieves the start position.
     */
    get startPosition() { return this.movement.startPosition; }

    /**
     * Retrieves the raw position.
     */
    get rawPosition() { return { x: this.movement.x, y: this.movement.y }; }
    
    /**
     * Retrieves the offset y.
     */
    get offsetY() { return this.movement.offsetY; }

    /**
     * Sets the offset y.
     * @param {any} val - The val.
     */
    set offsetY(val) { this.movement.offsetY = val; }
    
    /**
     * Retrieves the mesh.
     */
    get mesh() { return this.renderer.mesh; }

    /**
     * Retrieves the player model.
     */
    get playerModel() { return this.renderer.playerModel; }

    /**
     * Sets the allow speed up.
     * @param {any} val - The val.
     */
    set allowSpeedUp(val) { this.movement.allowSpeedUp = val; }

    /**
     * Retrieves the movement duration.
     */
    get movementDuration() { return this.movement.movementDuration; }

    /**
     * Sets the movement duration.
     * @param {any} val - The val.
     */
    set movementDuration(val) { this.movement.movementDuration = val; }

    /**
     * Retrieves the pending worm repel.
     */
    get pendingWormRepel() { return this.movement.pendingWormRepel; }

    /**
     * Retrieves the spacing x.
     */
    get spacingX() { return this.renderer.spacingX; }

    /**
     * Sets the spacing x.
     * @param {any} val - The val.
     */
    set spacingX(val) { this.renderer.spacingX = val; }

    /**
     * Retrieves the spacing z.
     */
    get spacingZ() { return this.renderer.spacingZ; }

    /**
     * Sets the spacing z.
     * @param {any} val - The val.
     */
    set spacingZ(val) { this.renderer.spacingZ = val; }

    /**
     * Retrieves the offset x.
     */
    get offsetX() { return this.renderer.offsetX; }

    /**
     * Sets the offset x.
     * @param {any} val - The val.
     */
    set offsetX(val) { this.renderer.offsetX = val; }

    /**
     * Retrieves the offset z.
     */
    get offsetZ() { return this.renderer.offsetZ; }

    /**
     * Sets the offset z.
     * @param {any} val - The val.
     */
    set offsetZ(val) { this.renderer.offsetZ = val; }

    /**
     * Checks whether is alive.
     */
    isAlive() {
        return this.state.isAlive();
    }

    /**
     * Destroys the player instance and cleans up resources.
     */
    destroy() {
        if (this.shieldGroup) {
            if (this.shieldParent) {
                this.shieldParent.remove(this.shieldGroup);
            }
            this.shieldMeshWire.geometry.dispose();
            this.shieldMeshWire.material.dispose();
            this.shieldMeshSolid.geometry.dispose();
            this.shieldMeshSolid.material.dispose();
            this.shieldGroup = null;
            this.shieldMeshWire = null;
            this.shieldMeshSolid = null;
            this.shieldParent = null;
        }
        this.ui.hideHud();
        this.renderer.destroy();
        const gameOverScreen = document.getElementById("game-over-screen");
        if (gameOverScreen) gameOverScreen.remove();
        if (typeof super.destroy === "function") super.destroy();
    }

    /**
     * Triggers the attack action.
     * @param {any} word - The word.
     * @param {any} closestEnemy - The closestEnemy.
     */
    attack(word, closestEnemy = null) {
        return this.spells.attack(word, closestEnemy, this, this.scene);
    }

    /**
     * Updates the movement of the entity.
     * @param {any} newPosition - The newPosition.
     * @param {any} keyboardLayout - The keyboardLayout.
     */
    move(newPosition, keyboardLayout = null) {
        this.movement.checkForWormBlockade(newPosition, keyboardLayout, this.enemiesManager);
        const result = this.movement.startMovement(newPosition, keyboardLayout);
        if (this.movement.isMoving) {
            this.renderer.updateRotation(this.movement.facingDirection);
        }
        return result;
    }

    /**
     * Updates the player state and logic.
     * @param {any} deltaTime - The deltaTime.
     * @param {any} keyboardLayout - The keyboardLayout.
     */
    update(deltaTime = 0.0166, keyboardLayout = null) {
        if (!this.handleDeathState()) return;

        this.spells.update(deltaTime * 1000);
        
        this.movement.checkRepelWhenIdle(keyboardLayout, this.enemiesManager, (worm, repelKey) => {
            this.executeIdleRepel(worm, repelKey, keyboardLayout);
        });

        this.movement.update(deltaTime);
        this.applyWormDamageDuringMovement();
        this.updateShield(deltaTime);

        if (this.renderer.mesh) {
            this.handleIdleTileHeight(keyboardLayout);
            this.renderer.updatePosition(this.movement);
            this.renderer.renderMovementAnimation(this.movement, this.movement.startPosition, this.movement.targetPosition, this.movement.pendingWormRepel);
        }
    }

    /**
     * Handles the death state event/action.
     */
    handleDeathState() {
        if (!this.state.isAlive()) {
            if (!this.state.deathAnimationPlayed) {
                this.ui.updateHpBar(this.state.hp, this.state.hpMax);
                this.renderer.renderDeath();
                this.state.deathAnimationPlayed = true;
                this.ui.showGameOverScreen(this.state.deathReason, this.onDeath);
            }
            return false;
        }
        return true;
    }

    /**
     * Handles the hp changed event/action.
     * @param {any} data - The data.
     */
    handleHpChanged(data) {
        this.ui.updateHpBar(data.hp, data.hpMax);
        if (data.damage) {
            this.ui.triggerScreenShake();
            this.ui.showDamageVignette();
            this.ui.showFloatingText(this.renderer.mesh.position, data.damage, "damage-taken");
        }
        if (data.healed) {
            this.ui.showFloatingText(this.renderer.mesh.position, data.healed, "heal");
        }
    }

    /**
     * Executes the idle repel.
     * @param {any} worm - The worm.
     * @param {any} repelKey - The repelKey.
     * @param {any} keyboardLayout - The keyboardLayout.
     */
    executeIdleRepel(worm, repelKey, keyboardLayout) {
        if (worm.type === "hazard_worm") this.damage(20, LanguageManager.t("death.worm"));
        else AudioManager.playSFX("/asset/game_assets/sounds/impact.wav", "player", 0.3);

        this.move({ x: repelKey.rawPosition.x, y: repelKey.rawPosition.y, offsetY: this.movement.getTileSurfaceHeight(repelKey) }, keyboardLayout);
    }

    /**
     * Applies the worm damage during movement.
     */
    applyWormDamageDuringMovement() {
        if (!this.movement.isMoving || !this.movement.pendingWormRepel || this.movement.movementProgress < 0.5 || this.movement.pendingWormRepel.applied) return;
        
        this.movement.pendingWormRepel.applied = true;
        const worm = this.movement.pendingWormRepel.worm;
        
        if (worm.type === "hazard_worm") {
            this.damage(20, LanguageManager.t("death.worm"));
        } else {
            AudioManager.playSFX("/asset/game_assets/sounds/impact.wav", "player", 0.3);
        }
    }

    /**
     * Handles the idle tile height event/action.
     * @param {any} keyboardLayout - The keyboardLayout.
     */
    handleIdleTileHeight(keyboardLayout) {
        if (this.movement.isMoving || !keyboardLayout) return;
        
        const currentKey = keyboardLayout.find(k => Math.abs(k.rawPosition.x - this.movement.x) < 0.1 && Math.abs(k.rawPosition.y - this.movement.y) < 0.1);
        if (currentKey) {
            this.movement.offsetY = this.movement.getTileSurfaceHeight(currentKey);
        }
    }

    /**
     * Applies the crouch.
     * @param {any} percentage - The percentage.
     */
    applyCrouch(percentage) {
        this.renderer.applyCrouch(percentage);
    }

    /**
     * Applies damage to the entity.
     * @param {any} amount - The amount.
     * @param {any} reason - The reason.
     */
    damage(amount, reason = null) {
        if (this.state.isInvulnerable && amount !== Infinity) return;

        if (this.shieldEnergy > 0 && amount !== Infinity) {
            if (this.shieldEnergy >= amount) {
                this.shieldEnergy -= amount;
                amount = 0;
            } else {
                amount -= this.shieldEnergy;
                this.shieldEnergy = 0;
            }
        }

        if (amount > 0) {
            const hasEarthBoss = this.enemiesManager && this.enemiesManager.boss && this.enemiesManager.boss.name === "EarthCore";
            if (hasEarthBoss && this.state.hp - amount <= 0) {
                if (!this.savingCinematicTriggered) {
                    this.savingCinematicTriggered = true;
                    this.state.hp = 1;
                    this.state.isInvulnerable = true;
                    window.dispatchEvent(new CustomEvent("earth_boss_sempai_rescue"));
                    return;
                }
            }

            this.state.damage(amount, reason);
        }
    }

    /**
     * Restores health to the entity.
     * @param {any} amount - The amount.
     */
    heal(amount) {
        this.state.heal(amount);
    }

    /**
     * Handles the key press event/action.
     * @param {any} key - The key.
     * @param {any} findClosestEnemy - The findClosestEnemy.
     */
    handleKeyPress(key, findClosestEnemy) {
        return this.spells.handleKeyPress(key);
    }

    /**
     * Activates the shield.
     * @param {any} amount - The amount.
     */
    activateShield(amount) {
        if (this.shieldEnergy === undefined || isNaN(this.shieldEnergy)) {
            this.shieldEnergy = 0;
        }
        this.shieldEnergy = Math.min(300, this.shieldEnergy + amount);
        if (!this.shieldGroup) {
            const rawModel = this.playerModel && this.playerModel.children[0] ? this.playerModel.children[0] : null;
            const parentGroup = rawModel || this.playerModel || this.mesh;
            if (parentGroup) {
                this.shieldParent = parentGroup;
                this.shieldGroup = new THREE.Group();
                parentGroup.add(this.shieldGroup);

                let localY = 0.5;
                if (parentGroup === this.mesh) {
                    localY = 1.0;
                }

                const geoWire = new THREE.SphereGeometry(1.6, 24, 24);
                const matWire = new THREE.MeshBasicMaterial({
                    color: 0x00ffff,
                    transparent: true,
                    opacity: 0.4,
                    wireframe: true,
                    depthWrite: false
                });
                this.shieldMeshWire = new THREE.Mesh(geoWire, matWire);
                this.shieldMeshWire.position.set(0, localY, 0);
                this.shieldGroup.add(this.shieldMeshWire);

                const geoSolid = new THREE.SphereGeometry(1.5, 24, 24);
                const matSolid = new THREE.MeshBasicMaterial({
                    color: 0x00aaff,
                    transparent: true,
                    opacity: 0.1,
                    depthWrite: false
                });
                this.shieldMeshSolid = new THREE.Mesh(geoSolid, matSolid);
                this.shieldMeshSolid.position.set(0, localY, 0);
                this.shieldGroup.add(this.shieldMeshSolid);
            }
        }
        AudioManager.playSFX("/asset/game_assets/sounds/heal.wav", "player", 0.3);
    }

    /**
     * Updates the shield.
     * @param {any} deltaTime - The deltaTime.
     */
    updateShield(deltaTime) {
        if (this.shieldEnergy <= 0) {
            this.shieldEnergy = 0;
            if (this.shieldGroup) {
                if (this.shieldParent) {
                    this.shieldParent.remove(this.shieldGroup);
                }
                this.shieldMeshWire.geometry.dispose();
                this.shieldMeshWire.material.dispose();
                this.shieldMeshSolid.geometry.dispose();
                this.shieldMeshSolid.material.dispose();
                this.shieldGroup = null;
                this.shieldMeshWire = null;
                this.shieldMeshSolid = null;
                this.shieldParent = null;
            }
        } else if (this.shieldGroup) {
            const isScaledParent = this.shieldParent === this.playerModel || (this.playerModel && this.shieldParent === this.playerModel.children[0]);
            const scale = (1.0 + (this.shieldEnergy / 100) * 1.5) / (isScaledParent ? 1.95 : 1.0);
            this.shieldGroup.scale.set(scale, scale, scale);

            if (this.shieldMeshWire && this.shieldMeshSolid) {
                this.shieldMeshWire.material.opacity = Math.min(0.85, (this.shieldEnergy / 200) * 0.6 + 0.25);
                this.shieldMeshSolid.material.opacity = Math.min(0.6, (this.shieldEnergy / 200) * 0.45 + 0.1);
                this.shieldMeshWire.rotation.y += deltaTime * 1.5;
                this.shieldMeshWire.rotation.x += deltaTime * 0.8;
                this.shieldMeshSolid.rotation.y -= deltaTime * 0.5;
            }
        }
    }
}
