export default class Spell {
  word;
  damage;
  range;

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

  effect() {
    console.log("Do the spell effect.");
  }
}
