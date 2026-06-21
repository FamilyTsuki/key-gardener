import { ENEMY_TYPES } from "../../../constants/EnemyTypes.js";

export class EnemyState {
    constructor(type, hp, hpMax) {
        this.type = type;
        this.config = ENEMY_TYPES[type] || ENEMY_TYPES.basic;
        
        this.color = this.config.color;
        this.speed = this.config.speed;
        this.damage = this.config.damage || 20;
        
        const defaultHp = this.config.baseHp;
        this.hp = hp !== 100 ? hp : defaultHp;
        this.hpMax = hpMax !== 100 ? hpMax : defaultHp;
        this.listeners = {};
    }

    get isDead() {
        return this.hp <= 0 || this.hp === undefined;
    }

    get isWorm() {
        return this.type === "blocker_worm" || this.type === "hazard_worm";
    }

    get isSniper() {
        return this.type === "sniper";
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

    takeDamage(amount) {
        if (this.isDead) return;
        this.hp -= amount;
        if (this.hp <= 0) {
            this.isDead = true;
            this.hp = 0;
            this.emit("death");
        }
        this.emit("hp_changed", { hp: this.hp, hpMax: this.hpMax, damage: amount });
    }
}
