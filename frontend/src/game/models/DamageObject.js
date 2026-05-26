/**
 * Represents an object that can deal damage to other entities.
 */
export default class DamageObject {
  /**
   * Creates a new damage object.
   * @param {{x: number, y: number}} position - The world position.
   * @param {{width: number, height: number}} size - The size of the object.
   * @param {number} damage - The amount of damage dealt.
   */
  constructor(position, size, damage) {
    this.position = position;
    this.size = size;
    this.damage = damage;
    this.isDead = false;
  }

  /**
   * Checks if this object is colliding with a target.
   * @param {Object} target - The target object to check collision against.
   * @param {{x: number, y: number}} target.position - The target's position.
   * @param {{width: number, height: number}} target.size - The target's size.
   * @returns {boolean} True if a collision occurs, false otherwise.
   */
  checkCollision(target) {
    return (
      this.position.x < target.position.x + target.size.width &&
      this.position.x + this.size.width > target.position.x &&
      this.position.y < target.position.y + target.size.height &&
      this.position.y + this.size.height > target.position.y
    );
  }

  /**
   * Draws the damage object on the canvas.
   * @param {CanvasRenderingContext2D} ctx - The canvas rendering context.
   */
  draw(ctx) {
    ctx.fillStyle = "red";
    ctx.fillRect(
      this.position.x,
      this.position.y,
      this.size.width,
      this.size.height,
    );
  }
}
