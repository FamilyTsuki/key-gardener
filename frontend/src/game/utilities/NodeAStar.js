/**
 * Represents a node in the A* pathfinding grid.
 */
export default class NodeAStar {
  /** @type {string} */
  #key;
  /** @type {Object} */
  #position;
  /** @type {NodeAStar|null} */
  #parent;
  /** @type {Array<Object>} */
  #neighbours;
  /** @type {Object} */
  #cost;

  /**
   * Constructs a NodeAStar instance.
   * @param {string} key - The unique identifier of the node.
   * @param {Object} position - The coordinates of the node {x, y}.
   * @param {Array<Object>} neighbours - The list of neighboring nodes.
   * @param {NodeAStar|null} [parent=null] - The parent node in the path.
   */
  constructor(key, position, neighbours, parent = null) {
    this.#key = key;
    this.#position = position;
    this.#parent = parent;
    this.#neighbours = neighbours;
    this.#cost = { g: 0, h: 0, f: 0 };
  }

  /**
   * Gets the key of the node.
   * @returns {string} The node's key.
   */
  get key() {
    return this.#key;
  }

  /**
   * Gets the x-coordinate of the node.
   * @returns {number} The x-coordinate.
   */
  get x() {
    return this.#position.x;
  }

  /**
   * Gets the y-coordinate of the node.
   * @returns {number} The y-coordinate.
   */
  get y() {
    return this.#position.y;
  }

  /**
   * Gets the parent node.
   * @returns {NodeAStar|null} The parent node.
   */
  get parent() {
    return this.#parent;
  }

  /**
   * Gets the neighboring nodes.
   * @returns {Array<Object>} The array of neighbours.
   */
  get neighbours() {
    return this.#neighbours;
  }

  /**
   * Gets the cost object for pathfinding.
   * @returns {Object} The cost object {g, h, f}.
   */
  get cost() {
    return this.#cost;
  }

  /**
   * Sets the parent node.
   * @param {NodeAStar|null} newParent - The new parent node.
   */
  set parent(newParent) {
    this.#parent = newParent;
  }

  /**
   * Creates a copy of this node with a specific parent.
   * @param {NodeAStar|null} parent - The parent for the copied node.
   * @returns {NodeAStar} A new instance of NodeAStar with the same properties.
   */
  copy(parent) {
    return new NodeAStar(this.#key, this.#position, this.#neighbours, parent);
  }
}
