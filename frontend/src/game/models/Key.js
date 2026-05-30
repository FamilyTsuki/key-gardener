import GameObject from "./GameObject.js";

/**
 * Represents a key object in the game.
 */
export default class Key extends GameObject {
  #key;
  #isPressed;
  #tileSize;

  /**
   * Creates a new key object.
   * @param {string} key - The string value of the key.
   * @param {number} x - The x position on the grid.
   * @param {number} y - The y position on the grid.
   * @param {boolean} isPressed - Indicates if the key is pressed.
   * @param {number} tileSize - The size of the tile.
   */
  constructor(key, x, y, isPressed, tileSize) {
    const spacing = 3.2;
    super({ x, y }, { x: x * spacing, y: y * spacing });

    this.#key = key;
    this.#isPressed = isPressed;
    this.#tileSize = tileSize;

    this.mesh = null;
    this.lightUpTimer = 0;
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
