import GameObject from "./GameObject.js";

/**
 * Represents an actor (character, enemy) in the game.
 */
export default class Actor extends GameObject {
  name;
  hp;
  hpMax;
  size;
  model;

  /**
   * Creates a new Actor.
   * @param {any} name - The name.
   * @param {any} hp - The hp.
   * @param {any} hpMax - The hpMax.
   * @param {any} rawPosition - The rawPosition.
   * @param {any} position - The position.
   * @param {any} size - The size.
   * @param {any} model - The model.
   */
  constructor(name, hp, hpMax, rawPosition, position, size, model) {
    super(rawPosition, position);

    this.name = name;
    this.hp = hp;
    this.hpMax = hpMax;
    this.size = size;
    this.model = model;
  }

  /**
   * Retrieves the name.
   */
  get name() {
    return this.name;
  }

  /**
   * Retrieves the hp.
   */
  get hp() {
    return this.hp;
  }

  /**
   * Checks whether the actor is still alive.
   * @returns {boolean} True if the actor's hp is greater than 0.
   */
  isAlive() {
    return this.hp > 0;
  }

  /**
   * Attacks another actor.
   * @param {any} actor - The actor.
   */
  attack(actor) {
    console.log(`${this.name} attacking ${actor.name}`);
  }

  /**
   * Draws the actor.
   * @param {any} ctx - The ctx.
   */
  draw(ctx) {
    if (!ctx) throw new Error("No ctx on draw !");

    if (
      this.model instanceof HTMLImageElement &&
      this.model.complete &&
      this.model.naturalWidth !== 0
    ) {
      ctx.drawImage(
        this.model,
        this.position.x,
        this.position.y,
        this.size.width,
        this.size.height,
      );
    } else {
      ctx.fillStyle = typeof this.model === "string" ? this.model : "red";
      ctx.fillRect(
        this.position.x,
        this.position.y,
        this.size.width,
        this.size.height,
      );
    }
  }
  /**
   * Moves the actor.
   */
  move() {}
  /**
   * Checks if this actor collides with another object.
   * @param {any} other - The other.
   * @returns {boolean} True if a collision occurs.
   */
  checkCollision(other) {
    const collision =
      this.position.x < other.position.x + other.size.width &&
      this.position.x + this.size.width > other.position.x &&
      this.position.y < other.position.y + other.size.height &&
      this.position.y + this.size.height > other.position.y;

    return collision;
  }
}
