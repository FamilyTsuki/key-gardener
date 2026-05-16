import GameObject from "./GameObject.js";

export default class Key extends GameObject {
  #key;
  #isPressed;
  #tileSize;

  constructor(key, x, y, isPressed, tileSize) {
    const spacing = 3.2;
    super({ x, y }, { x: x * spacing, y: y * spacing });

    this.#key = key;
    this.#isPressed = isPressed;
    this.#tileSize = tileSize;

    this.mesh = null;
  }

  get key() {
    return this.#key;
  }
  set isPressed(isPressed) {
    this.#isPressed = isPressed;
  }

  get isPressed() {
    return this.#isPressed;
  }
  set isPressed(val) {
    this.#isPressed = val;
  }
}
