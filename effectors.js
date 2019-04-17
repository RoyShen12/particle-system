class ChamberBox {
  constructor(x1 = 0, y1 = 0, x2 = window.__width, y2 = window.__height, elasticCoefficient = 1) {
    /**
     * @type {(p:Particle) => void}
     */
    this.apply = particle => {
      // if (particle.position.x < x1) {
      //   particle.position.x = x1
      // }

      // if (particle.position.x > x2) {
      //   particle.position.x = x2
      // }

      // if (particle.position.y < y1) {
      //   particle.position.y = y1
      // }

      // if (particle.position.y > y2) {
      //   particle.position.y = y2
      // }

      if (particle.position.x - particle.radius < x1 || particle.position.x + particle.radius > x2) {
        particle.velocity.x = -1 * elasticCoefficient * particle.velocity.x
      }

      if (particle.position.y - particle.radius < y1 || particle.position.y + particle.radius > y2) {
        particle.velocity.y = -1 * elasticCoefficient * particle.velocity.y
      }
    }
  }
}

class Gravity {
  constructor(G = new Vector2(0, 98)) {
    /**
     * @type {(p:Particle) => void}
     */
    this.apply = particle => {
      particle.velocity = particle.velocity.add(G.multiply(window.__differentialOfTime))
    }
  }
}

class LoopWorld {
  constructor(x1 = 0, y1 = 0, x2 = window.__width, y2 = window.__height) {
    /**
     * @type {(p:Particle) => void}
     */
    this.apply = particle => {
      if (particle.position.x - particle.radius < x1) {
        particle.position.x = x2 - particle.radius
      }
      else if (particle.position.x + particle.radius > x2) {
        particle.position.x = x1 + particle.radius
      }

      if (particle.position.y - particle.radius < y1) {
        particle.position.y = y2 - particle.radius
      }
      else if (particle.position.y + particle.radius > y2) {
        particle.position.y = y1 + particle.radius
      }
    }
  }
}

class BlackHoleEdge {
  constructor(x1 = 0, y1 = 0, x2 = window.__width, y2 = window.__height) {
    this.apply = particle => {
      if (particle.position.x - particle.radius < x1 ||
        particle.position.x + particle.radius > x2 ||
        particle.position.y - particle.radius < y1 ||
        particle.position.y + particle.radius > y2)
        particle.dead = true
    }
  }
}
