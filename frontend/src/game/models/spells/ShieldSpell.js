import Spell from "../Spell.js";

export default class ShieldSpell extends Spell {
    constructor(word, damage, range = Infinity) {
        super(word, damage, range);
    }

    effect(closestEnemy, player, scene) {
        if (player) {
            player.activateShield(75);
            return true;
        }
        return false;
    }
}
