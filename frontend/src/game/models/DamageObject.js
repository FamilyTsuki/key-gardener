export default class DamageObject {
  constructor(position, size, damage) {
    this.position = position;
    this.size = size;
    this.damage = damage;
    this.isDead = false;
  }

  checkCollision(target) {
    return (
      this.position.x < target.position.x + target.size.width &&
      this.position.x + this.size.width > target.position.x &&
      this.position.y < target.position.y + target.size.height &&
      this.position.y + this.size.height > target.position.y
    );
  }

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
