export default class NodeAStar {
  #key;
  #position; //? { x: Number, y: Number }
  #parent; //? null / String (key)
  #neighbours; //? [String (key), String (key), ...]
  #cost;

  constructor(key, position, neighbours, parent = null) {
    this.#key = key;
    this.#position = position;
    this.#parent = parent;
    this.#neighbours = neighbours;
    this.#cost = { g: 0, h: 0, f: 0 };
  }

  get key() {
    return this.#key;
  }
  get x() {
    return this.#position.x;
  }
  get y() {
    return this.#position.y;
  }
  get parent() {
    return this.#parent;
  }
  get neighbours() {
    return this.#neighbours;
  }
  get cost() {
    return this.#cost;
  }

  set parent(newParent) {
    this.#parent = newParent;
  }

  copy(parent) {
    return new NodeAStar(this.#key, this.#position, this.#neighbours, parent);
  }
}
