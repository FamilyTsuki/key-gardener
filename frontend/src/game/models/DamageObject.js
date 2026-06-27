/**
 * Represents an object that can deal damage to other entities.
 */
export default class DamageObject {
  /**
   * Creates a new damage object.
   * @param {any} position - The position.
   * @param {any} size - The size.
   * @param {any} damage - The damage.
   */
  constructor(position, size, damage) {
    this.position = position;
    this.size = size;
    this.damage = damage;
    this.isDead = false;
  }

  /**
   * Checks if this object is colliding with a target.
   * @param {any} target - The target.
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
   * @param {any} ctx - The ctx.
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
