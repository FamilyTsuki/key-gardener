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
   * @param {any} key - The key.
   * @param {any} x - The x.
   * @param {any} y - The y.
   * @param {any} isPressed - The isPressed.
   * @param {any} tileSize - The tileSize.
   * @param {any} isGround - The isGround.
   */
  constructor(key, x, y, isPressed, tileSize, isGround = false) {
    const spacing = 3.2;
    super({ x, y }, { x: x * spacing, y: y * spacing });

    this.#key = key;
    this.#isPressed = isPressed;
    this.#tileSize = tileSize;
    this.isGround = isGround;

    this.mesh = null;
    this.lightUpTimer = 0;
  }

  /**
   * Retrieves the key.
   */
  get key() {
    return this.#key;
  }

  /**
   * Sets the is pressed.
   * @param {any} isPressed - The isPressed.
   */
  set isPressed(isPressed) {
    this.#isPressed = isPressed;
  }

  /**
   * Retrieves the is pressed.
   */
  get isPressed() {
    return this.#isPressed;
  }

  /**
   * Sets the is pressed.
   * @param {any} val - The val.
   */
  set isPressed(val) {
    this.#isPressed = val;
  }
}
