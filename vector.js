class Vector2 {
  /**
   * @param {number} x 
   * @param {number} y
   */
  constructor (x, y) {
    /** @type {number} */
    this.x = x
    /** @type {number} */
    this.y = y
  }

  copy() {
    return new Vector2(this.x, this.y)
  }
  length() {
    return Math.sqrt(this.x * this.x + this.y * this.y)
  }
  sqrLength() {
    return this.x * this.x + this.y * this.y
  }
  normalize() {
    var inv = 1 / this.length()
    return new Vector2(this.x * inv, this.y * inv)
  }
  negate() {
    return new Vector2(-this.x, -this.y)
  }
  /**
   * @param {Vector2} v
   */
  add(v) {
    return new Vector2(this.x + v.x, this.y + v.y)
  }
  /**
   * @param {Vector2} v
   */
  subtract(v) {
    return new Vector2(this.x - v.x, this.y - v.y)
  }
  /**
   * @param {number} f 
   */
  multiply(f) {
    return new Vector2(this.x * f, this.y * f)
  }
  /**
   * @param {number} f
   */
  divide(f) {
    var invf = 1 / f
    return new Vector2(this.x * invf, this.y * invf)
  }
  /**
   * @param {Vector2} v
   */
  dot(v) {
    return this.x * v.x + this.y * v.y
  }
  /**
   * 
   * @param {number} angle 
   * @param {Vector2} center 
   */
  rotate(angle, center) {
    return new Vector2(
      (this.x - center.x) * Math.cos(angle) - (this.y - center.y) * Math.sin(angle) + center.x,
      (this.x - center.x) * Math.sin(angle) + (this.y - center.y) * Math.cos(angle) + center.y
    )
  }
  /**
   * @param {Vector2} other
   */
  equal(other, epsilon = 0) {
    return Math.abs(this.x - other.x) <= epsilon && Math.abs(this.y - other.y) <= epsilon
  }

  // debug
  isNaN() {
    return isNaN(this.x) || isNaN(this.y)
  }
}

Vector2.zero = new Vector2(0, 0)
Vector2.unit = function (x, y) {
  const u = new Vector2(x, y)
  const dvd = u.length()
  return u.divide(dvd)
}
