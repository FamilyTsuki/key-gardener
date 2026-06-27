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
   * @param {string|number} id - The unique identifier of the tile.
   * @param {number} x - The x coordinate on the grid.
   * @param {number} y - The y coordinate on the grid.
   * @param {boolean} isPressed - Whether the tile is currently pressed.
   * @param {number} tileSize - The size of the tile.
   * @param {string} [letter] - The letter associated with this tile.
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
 * @param {any} val - The is pressed value.
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
