class Color {
  /**
   * @param {number} r 
   * @param {number} g
   * @param {number} b
   */
  constructor(r, g, b) {
    /** @type {number} */
    this.r = r
    /** @type {number} */
    this.g = g
    /** @type {number} */
    this.b = b
  }

  copy() { return new Color(this.r, this.g, this.b) }
  /**
   * @param {Color} c 
   */
  add(c) { return new Color(this.r + c.r, this.g + c.g, this.b + c.b) }
  /**
   * @param {number} s 
   */
  multiply(s) { return new Color(this.r * s, this.g * s, this.b * s) }
  /**
   * @param {Color} c 
   */
  modulate(c) { return new Color(this.r * c.r, this.g * c.g, this.b * c.b) }
  saturate() {
    this.r = Math.min(this.r, 1)
    this.g = Math.min(this.g, 1)
    this.b = Math.min(this.b, 1)
  }

  toRgba(alpha) {
    return `rgba(${Math.floor(this.r * 255)},${Math.floor(this.g * 255)},${Math.floor(this.b * 255)},${alpha})`
  }
  toReversedRgba(alpha) {
    return `rgba(${Math.floor((1 - this.r) * 255)},${Math.floor((1 - this.g) * 255)},${Math.floor((1 - this.b) * 255)},${alpha})`
  }
}

Color.black = new Color(0, 0, 0)
Color.white = new Color(1, 1, 1)
Color.red = new Color(1, 0, 0)
Color.green = new Color(0, 1, 0)
Color.blue = new Color(0, 0, 1)
Color.yellow = new Color(1, 1, 0)
Color.cyan = new Color(0, 1, 1)
Color.purple = new Color(1, 0, 1)
Color.random = function () {
  return new Color(_.random(0.15, 0.9, true), _.random(0.1, 0.9, true), _.random(0.2, 0.9, true))
}
