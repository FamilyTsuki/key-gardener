/**
 * Represents a base game object.
 */
export default class GameObject {
  rawPosition;
  position;

  /**
   *
   * @param {any} rawPosition - The rawPosition.
   * @param {any} position - The position.
   */
  constructor(rawPosition, position) {
    this.rawPosition = { ...rawPosition };
    this.position = { ...position };
  }

  /**
   * Retrieves the raw position.
   */
  get rawPosition() {
    return this.rawPosition;
  }

  /**
   * Retrieves the position.
   */
  get position() {
    return this.position;
  }

  /**
   * Retrieves the x.
   */
  get x() {
    return this.position.x;
  }

  /**
   * Retrieves the y.
   */
  get y() {
    return this.position.y;
  }

  /**
   * Retrieves the z.
   */
  get z() {
    return this.position.z;
  }

  /**
   * Sets the x.
   * @param {any} X - The X.
   */
  set x(X) {
    this.position.x = X;
  }

  /**
   * Sets the y.
   * @param {any} Y - The Y.
   */
  set y(Y) {
    this.position.y = Y;
  }

  /**
   * Draws the game object.
   */
  draw() {
    console.log("Drawing");
  }
}
