import GameObject from "./GameObject.js";

export default class HexTile extends GameObject {
  #id;
  #isPressed;
  #tileSize;
  #letter;

  constructor(id, x, y, isPressed, tileSize, letter) {
    const R = 1.5;
    const hexWidth = Math.sqrt(3) * R;
    const hexHeight = 1.5 * R;
    const world_x = (x * hexWidth) + 12;
    const world_z = y * hexHeight;

    super({ x, y }, { x: world_x, y: world_z });

    this.#id = id;
    this.#isPressed = isPressed;
    this.#tileSize = tileSize;
    this.#letter = letter;

    this.mesh = null;
  }

  get id() {
    return this.#id;
  }

  get isPressed() {
    return this.#isPressed;
  }

  set isPressed(val) {
    this.#isPressed = val;
  }

  get letter() {
    return this.#letter;
  }
}
