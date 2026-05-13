export default class GameObject {
  rawPosition;
  position;

  /**
   *
   * @param {Object} rawPosition = {x: Number, y: Number}
   * @param {Object} position = {x: Number, y: Number}
   */
  constructor(rawPosition, position) {
    this.rawPosition = rawPosition;
    this.position = position;
  }

  get rawPosition() {
    return this.rawPosition;
  }
  get position() {
    return this.position;
  }
  get x() {
    return this.position.x;
  }
  get y() {
    return this.position.y;
  }
  get z() {
    return this.position.z;
  }

  set x(X) {
    this.position.x = X;
  }
  set y(Y) {
    this.position.y = Y;
  }

  draw() {
    console.log("Drawing");
  }
}
