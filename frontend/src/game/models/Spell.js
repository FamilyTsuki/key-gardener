/**
 * Represents a spell that can be cast in the game.
 */
export default class Spell {
  word;
  damage;
  range;

  /**
   * Creates a new spell.
   * @param {string} word - The word used to cast the spell.
   * @param {number} damage - The amount of damage the spell deals.
   * @param {number} range - The range of the spell.
   */
  constructor(word, damage, range) {
    this.word = word;
    this.damage = damage;
    this.range = range;
  }

  get word() {
    return this.word;
  }
  get damage() {
    return this.damage;
  }
  get range() {
    return this.range;
  }

  /**
   * Triggers the effect of the spell.
   */
  effect() {
    console.log("Do the spell effect.");
  }
}
