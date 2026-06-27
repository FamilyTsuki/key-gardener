import Spell from "../Spell.js";

/**
 * Undefined spell that sets the enemy's health to undefined.
 * Inherits from Spell.
 */
export default class Undefined extends Spell {
  /**
   * Constructs an Undefined spell.
   */
  constructor() {
    super("undefined", undefined, 10);
  }

  /**
   * Activates the spell's effect, instantly eliminating the enemy if within range.
   * @param {any} closestEnemy - The closestEnemy.
   */
  effect(closestEnemy) {
    if (closestEnemy) {
      if (closestEnemy.dist <= this.range) {
        closestEnemy.instance.hp = undefined;
      }
    }
  }
}
