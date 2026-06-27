import GameObject from "./GameObject.js";

/**
 * Represents a hexagonal tile in the world.
 */
export default class HexTile extends GameObject {
  #id;
  #isPressed;
  #tileSize;
  #letter;

  /**
   * Creates a new hex tile.
   * @param {any} id - The id.
   * @param {any} x - The x.
   * @param {any} y - The y.
   * @param {any} isPressed - The isPressed.
   * @param {any} tileSize - The tileSize.
   * @param {any} letter - The letter.
   */
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

    this.renderMesh = true;
    this.role = null;
    this.mesh = null;
  }

  /**
   * Retrieves the id.
   */
  get id() {
    return this.#id;
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

  /**
   * Retrieves the letter.
   */
  get letter() {
    return this.#letter;
  }
}
