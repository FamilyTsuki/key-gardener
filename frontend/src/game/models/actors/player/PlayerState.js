import { AudioManager } from "../../../managers/AudioManager.js";

export class PlayerState {
    constructor(config) {
        this.playerName = config.playerName || "Unknown";
        this.hp = config.hp || 100;
        this.hpMax = config.hpMax || 100;
        this.statsManager = config.statsManager || null;
        
        this.deathReason = null;
        this.deathAnimationPlayed = false;
        
        this.listeners = {};
    }

    on(event, callback) {
        if (!this.listeners[event]) this.listeners[event] = [];
        this.listeners[event].push(callback);
    }

    emit(event, data) {
        if (this.listeners[event]) {
            this.listeners[event].forEach(cb => cb(data));
        }
    }

    isAlive() {
        return this.hp > 0;
    }

    damage(amount, reason = null) {
        this.hp -= amount;

        if (reason && this.hp <= 0) {
            this.deathReason = reason;
        }

        AudioManager.playSFX("/asset/game_assets/sounds/ouch.wav", "player", 0.5);
        this.emit("hp_changed", { hp: this.hp, hpMax: this.hpMax, damage: amount });
    }

    heal(amount) {
        if (this.hp >= this.hpMax) return 0;
        
        const healAmount = Math.min(amount, this.hpMax - this.hp);
        this.hp += healAmount;
        
        this.emit("hp_changed", { hp: this.hp, hpMax: this.hpMax, healed: healAmount });
        return healAmount;
    }
}
