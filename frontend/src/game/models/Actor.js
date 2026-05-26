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
   * @param {string} name - The name of the actor.
   * @param {number} hp - The current hit points.
   * @param {number} hpMax - The maximum hit points.
   * @param {{x: number, y: number}} rawPosition - The raw grid position.
   * @param {{x: number, y: number}} position - The world position.
   * @param {{width: number, height: number}} size - The size of the actor.
   * @param {HTMLImageElement|string} model - The visual representation model.
   */
  constructor(name, hp, hpMax, rawPosition, position, size, model) {
    super(rawPosition, position);

    this.name = name;
    this.hp = hp;
    this.hpMax = hpMax;
    this.size = size;
    this.model = model;
  }

  get name() {
    return this.name;
  }
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
   * @param {Actor} actor - The target actor to attack.
   */
  attack(actor) {
    console.log(`${this.name} attacking ${actor.name}`);
  }

  /**
   * Draws the actor.
   * @param {CanvasRenderingContext2D} ctx - The canvas rendering context.
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
   * @param {Object} other - The object to check collision against.
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
