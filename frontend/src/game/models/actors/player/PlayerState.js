import { AudioManager } from "../../../managers/AudioManager.js";

export class PlayerState {
    constructor(config) {
        this.playerName = config.playerName || "Unknown";
        this.hp = config.hp || 100;
        this.hpMax = config.hpMax || 100;
        this.statsManager = config.statsManager || null;
        
        this.deathReason = null;
        this.deathAnimationPlayed = false;
        this.isInvulnerable = false;
        
        this.listeners = {};
    }

    /**
     * Handles the  event/action.
     * @param {any} event - The event.
     * @param {any} callback - The callback.
     */
    on(event, callback) {
        if (!this.listeners[event]) this.listeners[event] = [];
        this.listeners[event].push(callback);
    }

    /**
     * Emits an event to the socket or listeners.
     * @param {any} event - The event.
     * @param {any} data - The data.
     */
    emit(event, data) {
        if (this.listeners[event]) {
            this.listeners[event].forEach(cb => cb(data));
        }
    }

    /**
     * Checks whether is alive.
     */
    isAlive() {
        return this.hp > 0;
    }

    /**
     * Applies damage to the entity.
     * @param {any} amount - The amount.
     * @param {any} reason - The reason.
     */
    damage(amount, reason = null) {
        if (amount === Infinity) {
            this.hp = 0;
        } else {
            if (this.isInvulnerable) return;
            this.hp -= amount;
        }

        if (reason && this.hp <= 0) {
            this.deathReason = reason;
        }
        const audio = Math.floor(Math.random() * 3) + 1;
        AudioManager.playSFX(`/asset/game_assets/sounds/damage_${audio}.wav`, "player", 0.8);
        this.emit("hp_changed", { hp: this.hp, hpMax: this.hpMax, damage: amount === Infinity ? 9999 : amount });
    }

    /**
     * Restores health to the entity.
     * @param {any} amount - The amount.
     */
    heal(amount) {
        if (this.hp >= this.hpMax) return 0;
        
        const healAmount = Math.min(amount, this.hpMax - this.hp);
        this.hp += healAmount;
        
        this.emit("hp_changed", { hp: this.hp, hpMax: this.hpMax, healed: healAmount });
        return healAmount;
    }
}
