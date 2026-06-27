import Spell from "../Spell.js";

export default class ShieldSpell extends Spell {
    constructor(word, damage, range = Infinity) {
        super(word, damage, range);
    }

    /**
     * Applies the spell effects.
     * @param {any} closestEnemy - The closestEnemy.
     * @param {any} player - The player.
     * @param {any} scene - The scene.
     */
    effect(closestEnemy, player, scene) {
        if (player) {
            player.activateShield(75);
            return true;
        }
        return false;
    }
}
