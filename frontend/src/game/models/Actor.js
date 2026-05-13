import GameObject from "./GameObject.js";

export default class Actor extends GameObject {
  name;
  hp;
  hpMax;
  size; //? {width: Number, height: Number}
  model; //? model 3d

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

  isAlive() {
    return this.hp > 0;
  }

  attack(actor) {
    console.log(`${this.name} attacking ${actor.name}`);
  }

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
  move() {}
  checkCollision(other) {
    const collision =
      this.position.x < other.position.x + other.size.width &&
      this.position.x + this.size.width > other.position.x &&
      this.position.y < other.position.y + other.size.height &&
      this.position.y + this.size.height > other.position.y;

    return collision;
  }
}
