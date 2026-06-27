import { GamePhase } from "./GamePhase.js";
import * as THREE from "three";
import SocketService from "../../core/services/SocketService.js?v=1";
import { getKeyboardLayout } from "../utilities/KEYBOARD.js";
import { JailSpell } from "../models/spells/DuelSpell.js";

import { DuelState } from "./duel/DuelState.js";
import { DuelRenderer } from "./duel/DuelRenderer.js";
import { DuelUI } from "./duel/DuelUI.js";
import { DuelInput } from "./duel/DuelInput.js";
import { DuelSocketManager } from "./duel/DuelSocketManager.js";

export class DuelPhase extends GamePhase {
    constructor(gameEngine, duelData) {
        super(gameEngine);
        this.state = new DuelState(this, duelData);
        this.renderer = new DuelRenderer(this);
        this.ui = new DuelUI(this);
        this.input = new DuelInput(this);
        this.socketManager = new DuelSocketManager(this);
        
        this.localPlayer = null;
        this.remotePlayer = null;
        this.localStunVisual = null;
        this.remoteStunVisual = null;
        this.localJailCage = null;
        this.remoteJailCage = null;
    }

    /**
     * Initializes the duel phase.
     */
    async init() {
        const scene = this.gameEngine.scene;
        await this.renderer.init(scene, this.gameEngine.camera, this.state.localData, this.state.remoteData);

        this.ui.buildUI(this.state.localData, this.state.remoteData);
        this.state.initSpells();
        this.ui.updateSpellsUI(this.state.availableSpells, this.state.currentTypedSpell);

        this.socketManager.register();

        this.settingsListener = () => {
            if (this.renderer.localKeyboard && this.renderer.localKeyboard.rebuild) {
                this.renderer.localKeyboard.rebuild(getKeyboardLayout());
            }
            if (this.renderer.remoteKeyboard && this.renderer.remoteKeyboard.rebuild) {
                this.renderer.remoteKeyboard.rebuild(getKeyboardLayout());
            }
        };
        window.addEventListener("settings_updated", this.settingsListener);
    }

    /**
     * Activates the jail local.
     */
    activateJailLocal() {
        if (this.localPlayer.isJailed) return;
        this.localPlayer.isJailed = true;
        this.state.currentTypedJail = "";
        this.state.jailEscapeWord = this.state.getRandomWord(5);
        
        this.ui.activateJailUI();
        this.ui.updateJailUI(this.state.jailEscapeWord, this.state.currentTypedJail);

        this.localJailCage = this.renderer.createJailVisual(this.localPlayer);
    }

    /**
     * Escapes the jail.
     */
    escapeJail() {
        this.localPlayer.isJailed = false;
        this.ui.removeJailUI();
        if (this.localJailCage && this.localJailCage.parent) {
            this.localJailCage.parent.remove(this.localJailCage);
            this.localJailCage = null;
        }
    }

    /**
     * Handles the key down event/action.
     * @param {any} event - The event.
     */
    handleKeyDown(event) {
        this.input.handleKeyDown(event);
    }

    /**
     * Updates the duel phase state.
     * @param {any} deltaTime - The deltaTime.
     */
    update(deltaTime) {
        if (this.renderer.decor) this.renderer.decor.update(deltaTime);
        this.renderer.updateCamera(this.gameEngine.camera);

        this.state.updateCooldowns(deltaTime);
        this.ui.updateSpellsUI(this.state.availableSpells, this.state.currentTypedSpell);

        if (this.state.isDuelOver) return;

        this.state.wpmUpdateTimer += deltaTime;
        if (this.state.wpmUpdateTimer >= 2.0) {
            this.state.wpmUpdateTimer = 0;
            SocketService.emit('update_wpm', { wpm: this.state.getCurrentWpm() });
        }

        this.updateStunStates(deltaTime);
        this.updatePlayerStates(deltaTime);
        this.updateJailVisuals(deltaTime);
        this.updateProjectilesAndZones(deltaTime);
    }

    /**
     * Updates the stun states.
     * @param {any} deltaTime - The deltaTime.
     */
    updateStunStates(deltaTime) {
        if (this.localPlayer && this.localPlayer.stunTimer > 0) {
            this.localPlayer.stunTimer = Math.max(0, this.localPlayer.stunTimer - deltaTime);
            if (!this.localStunVisual) this.localStunVisual = this.renderer.createStunVisual(this.localPlayer);
            this.renderer.updateStunVisual(this.localStunVisual, deltaTime);
            this.ui.updateStunUI(true);
        } else {
            if (this.localStunVisual && this.localStunVisual.parent) {
                this.localStunVisual.parent.remove(this.localStunVisual);
                this.localStunVisual = null;
            }
            this.ui.updateStunUI(false);
        }

        if (this.remotePlayer && this.remotePlayer.stunTimer > 0) {
            this.remotePlayer.stunTimer = Math.max(0, this.remotePlayer.stunTimer - deltaTime);
            if (!this.remoteStunVisual) this.remoteStunVisual = this.renderer.createStunVisual(this.remotePlayer);
            this.renderer.updateStunVisual(this.remoteStunVisual, deltaTime);
        } else {
            if (this.remoteStunVisual && this.remoteStunVisual.parent) {
                this.remoteStunVisual.parent.remove(this.remoteStunVisual);
                this.remoteStunVisual = null;
            }
        }
    }

    /**
     * Updates the player states.
     * @param {any} deltaTime - The deltaTime.
     */
    updatePlayerStates(deltaTime) {
        if (this.localPlayer) this.localPlayer.update(deltaTime);
        if (this.remotePlayer) this.remotePlayer.update(deltaTime);
    }

    /**
     * Updates the jail visuals.
     * @param {any} deltaTime - The deltaTime.
     */
    updateJailVisuals(deltaTime) {
        if (this.localJailCage) this.renderer.updateJailVisual(this.localJailCage, deltaTime);

        if (this.remotePlayer && this.remotePlayer.isJailed) {
            if (!this.remoteJailCage) this.remoteJailCage = this.renderer.createJailVisual(this.remotePlayer);
            this.renderer.updateJailVisual(this.remoteJailCage, deltaTime);
        } else {
            if (this.remoteJailCage && this.remoteJailCage.parent) {
                this.remoteJailCage.parent.remove(this.remoteJailCage);
                this.remoteJailCage = null;
            }
        }
    }

    /**
     * Updates the projectiles and zones.
     * @param {any} deltaTime - The deltaTime.
     */
    updateProjectilesAndZones(deltaTime) {
        for (let i = this.state.slowZones.length - 1; i >= 0; i--) {
            const sz = this.state.slowZones[i];
            sz.update(deltaTime, this.state.projectiles);
            if (sz.isExpired) this.state.slowZones.splice(i, 1);
        }

        for (let i = this.state.projectiles.length - 1; i >= 0; i--) {
            const p = this.state.projectiles[i];
            const targetModel = p.targetId == this.state.localData.id ? this.localPlayer : this.remotePlayer;
            
            if (targetModel) {
                p.update(deltaTime, targetModel);

                if (p.isDestroyed) {
                    const finalTargetPos = new THREE.Vector3();
                    targetModel.mesh.getWorldPosition(finalTargetPos);
                    finalTargetPos.y += 1.0;
                    
                    if (p.mesh.position.distanceTo(finalTargetPos) < 2.0) {
                        if (p.targetId == this.state.localData.id) {
                            SocketService.emit('take_damage', { spellId: p.id });
                            this.state.currentTypedDefense = "";
                            if (p instanceof JailSpell) this.activateJailLocal();
                        }
                    }
                    this.state.projectiles.splice(i, 1);
                    
                    const incoming = this.state.projectiles.filter(proj => proj.targetId == this.state.localData.id);
                    if (incoming.length === 0) this.state.currentTypedDefense = "";
                    
                    this.ui.updateDefensesUI(this.state.projectiles, this.state.localData, this.state.currentTypedDefense);
                }
            } else {
                p.destroy();
                this.state.projectiles.splice(i, 1);
            }
        }
    }

    /**
     * Draws the elements to the canvas or screen.
     */
    draw() {
        this.renderer.draw(this.localPlayer, this.remotePlayer);
    }

    /**
     * Cleans up the duel phase resources.
     */
    cleanup() {
        this.ui.cleanup();
        this.socketManager.unregister();
        
        if (this.localJailCage && this.localJailCage.parent) this.localJailCage.parent.remove(this.localJailCage);
        if (this.remoteJailCage && this.remoteJailCage.parent) this.remoteJailCage.parent.remove(this.remoteJailCage);
        if (this.localStunVisual && this.localStunVisual.parent) this.localStunVisual.parent.remove(this.localStunVisual);
        if (this.remoteStunVisual && this.remoteStunVisual.parent) this.remoteStunVisual.parent.remove(this.remoteStunVisual);
        
        this.state.slowZones.forEach(sz => sz.destroy());
        this.state.slowZones = [];

        this.renderer.cleanup(this.gameEngine.scene);

        if (this.localPlayer) this.localPlayer.destroy();
        if (this.remotePlayer) this.remotePlayer.destroy();

        if (this.settingsListener) window.removeEventListener("settings_updated", this.settingsListener);
    }
}
