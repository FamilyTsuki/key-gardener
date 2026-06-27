import SocketService from "../../../core/services/SocketService.js?v=1";
import * as THREE from "three";
import { LightSpell, HeavySpell, StunSpell, HealSpell, JailSpell, SlowZone, DuelSpell } from "../../models/spells/DuelSpell.js";

export class DuelSocketManager {
    constructor(phase) {
        this.phase = phase;
        
        this.boundOnSpellSpawned = this.onSpellSpawned.bind(this);
        this.boundOnSpellBlocked = this.onSpellBlocked.bind(this);
        this.boundOnHpUpdate = this.onHpUpdate.bind(this);
        this.boundOnDuelEnded = this.onDuelEnded.bind(this);
        this.boundOnOpponentMove = this.onOpponentMove.bind(this);
        this.boundOnStartCountdown = this.onStartCountdown.bind(this);
    }

    /**
     * Registers.
     */
    register() {
        SocketService.on('spell_spawned', this.boundOnSpellSpawned);
        SocketService.on('spell_blocked', this.boundOnSpellBlocked);
        SocketService.on('hp_update', this.boundOnHpUpdate);
        SocketService.on('duel_ended', this.boundOnDuelEnded);
        SocketService.on('opponent_move', this.boundOnOpponentMove);
        SocketService.on('start_countdown', this.boundOnStartCountdown);
        
        SocketService.emit('player_ready');
    }

    /**
     * Unregisters.
     */
    unregister() {
        SocketService.off('spell_spawned', this.boundOnSpellSpawned);
        SocketService.off('spell_blocked', this.boundOnSpellBlocked);
        SocketService.off('hp_update', this.boundOnHpUpdate);
        SocketService.off('duel_ended', this.boundOnDuelEnded);
        SocketService.off('opponent_move', this.boundOnOpponentMove);
        SocketService.off('start_countdown', this.boundOnStartCountdown);
    }

    /**
     * Handles the opponent move event/action.
 * @param {any} data - The data.
     */
    onOpponentMove(data) {
        if (this.phase.remotePlayer) {
            this.phase.remotePlayer.isJailed = false;
        }
        const { key } = data;
        const keyName = key.toUpperCase();
        const keyObj = this.phase.renderer.remoteKeyboard.find(keyName);
        if (keyObj && this.phase.remotePlayer) {
            this.phase.remotePlayer.move({
                x: keyObj.rawPosition.x,
                y: keyObj.rawPosition.y
            });
        }
    }

    /**
     * Handles the start countdown event/action.
     */
    onStartCountdown() {
        this.phase.ui.startCountdown(() => {
            this.phase.state.isCountdownActive = false;
            this.phase.state.duelStartTime = Date.now();
        });
    }

    /**
     * Handles the spell spawned event/action.
 * @param {any} data - The data.
     */
    onSpellSpawned(data) {
        const { spellId, attackerId, targetId, spellType, requiredLength, speedMultiplier } = data;
        const state = this.phase.state;
        
        const isLocalAttacker = attackerId == state.localData.id;
        const attackerModel = isLocalAttacker ? this.phase.localPlayer : this.phase.remotePlayer;
        const targetModel = targetId == state.localData.id ? this.phase.localPlayer : this.phase.remotePlayer;
        
        const startPos = new THREE.Vector3();
        if (attackerModel) attackerModel.mesh.getWorldPosition(startPos);
        else startPos.copy(isLocalAttacker ? new THREE.Vector3(0, 0.2, 6) : new THREE.Vector3(0, 0.2, -6));
        startPos.y += 1.0;

        const targetPos = new THREE.Vector3();
        if (targetModel) targetModel.mesh.getWorldPosition(targetPos);
        else targetPos.copy(isLocalAttacker ? new THREE.Vector3(0, 0.2, -6) : new THREE.Vector3(0, 0.2, 6));
        targetPos.y += 1.0;

        const defenseWord = state.getRandomWord(requiredLength);
        this.phase.ui.announceSpell(isLocalAttacker ? state.localData.username : state.remoteData.username, spellType);

        if (spellType === 'slow') {
            if (attackerModel) {
                const slowZone = new SlowZone(attackerModel, this.phase.gameEngine.scene);
                state.slowZones.push(slowZone);
            }
            return;
        }

        let projectile;
        const scene = this.phase.gameEngine.scene;
        const fireballGltf = this.phase.renderer.fireballGltf;

        if (spellType === 'light') projectile = new LightSpell(spellId, attackerId, targetId, spellType, requiredLength, speedMultiplier, defenseWord, startPos, targetPos, fireballGltf, scene);
        else if (spellType === 'heavy') projectile = new HeavySpell(spellId, attackerId, targetId, spellType, requiredLength, speedMultiplier, defenseWord, startPos, targetPos, fireballGltf, scene);
        else if (spellType === 'stun') projectile = new StunSpell(spellId, attackerId, targetId, spellType, requiredLength, speedMultiplier, defenseWord, startPos, targetPos, fireballGltf, scene);
        else if (spellType === 'heal') {
            const healStart = startPos.clone(); healStart.y += 4.0;
            projectile = new HealSpell(spellId, attackerId, attackerId, spellType, requiredLength, speedMultiplier, defenseWord, healStart, startPos, fireballGltf, scene);
        }
        else if (spellType === 'jail') projectile = new JailSpell(spellId, attackerId, targetId, spellType, requiredLength, speedMultiplier, defenseWord, startPos, targetPos, fireballGltf, scene);
        else projectile = new DuelSpell(spellId, attackerId, targetId, spellType, requiredLength, speedMultiplier, defenseWord, startPos, targetPos, fireballGltf, scene);

        state.projectiles.push(projectile);

        if (targetId == state.localData.id) {
            this.phase.ui.updateDefensesUI(state.projectiles, state.localData, state.currentTypedDefense);
        }
    }

    /**
     * Handles the spell blocked event/action.
 * @param {any} data - The data.
     */
    onSpellBlocked(data) {
        const { spellId } = data;
        const state = this.phase.state;
        const index = state.projectiles.findIndex(p => p.id === spellId);
        if (index !== -1) {
            state.projectiles[index].destroy();
            state.projectiles.splice(index, 1);
            
            const incoming = state.projectiles.filter(p => p.targetId == state.localData.id);
            if (incoming.length === 0) state.currentTypedDefense = "";
            
            this.phase.ui.updateDefensesUI(state.projectiles, state.localData, state.currentTypedDefense);
        }
    }

    /**
     * Handles the hp update event/action.
 * @param {any} data - The data.
     */
    onHpUpdate(data) {
        const state = this.phase.state;
        let localHp, remoteHp;
        if (state.duelData.player1.id == state.localData.id) {
            localHp = data.player1Hp; remoteHp = data.player2Hp;
        } else {
            localHp = data.player2Hp; remoteHp = data.player1Hp;
        }
        
        const localEl = document.getElementById('hp-local');
        const remoteEl = document.getElementById('hp-remote');
        if (localEl) localEl.textContent = localHp;
        if (remoteEl) remoteEl.textContent = remoteHp;
        
        const localFill = document.getElementById('hp-local-fill');
        const remoteFill = document.getElementById('hp-remote-fill');
        if (localFill) localFill.style.width = `${Math.max(0, localHp)}%`;
        if (remoteFill) remoteFill.style.width = `${Math.max(0, remoteHp)}%`;
        
        if (localHp < state.localData.hp) {
            state.localData.hp = localHp;
            this.phase.renderer.playHitAnimation(this.phase.localPlayer, true);
        }
        if (remoteHp < state.remoteData.hp) {
            state.remoteData.hp = remoteHp;
            this.phase.renderer.playHitAnimation(this.phase.remotePlayer, false);
        }
    }

    /**
     * Handles the duel ended event/action.
 * @param {any} data - The data.
     */
    onDuelEnded(data) {
        const state = this.phase.state;
        state.isDuelOver = true;
        let won = false;
        if (data.reason === "disconnect") won = data.loserId != state.localData.id;
        else won = data.winnerId == state.localData.id;

        const durationSecs = state.duelStartTime ? Math.floor((Date.now() - state.duelStartTime) / 1000) : 0;
        this.phase.ui.showEndOverlay(won, Math.round(state.getCurrentWpm()), durationSecs, state.successfulStrokesCount);
    }
}
