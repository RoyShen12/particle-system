class Particle {
  /**
   * @param {Vector2} position
   * @param {Vector2} velocity
   * @param {Color} color 
   * @param {number} mass 
   */
  constructor(position, velocity, color, mass, id = 0, stasis = false) {
    this.position = position
    this.velocity = velocity
    this.acceleration = Vector2.zero
    // this.age = 0
    // this.life = life
    this.color = color
    this.mass = mass
    // typical density: 1400kg/m3 m/ρ/4*3/PI = R^3
    this.radius = Particle.massToRadius(mass)

    this.stasis = stasis

    // console.log(this.radius)

    this.id = id
    this.dead = false

    this.isSelected = false
  }

  /**
   * @param {Particle} pOther
   */
  devourOther(pOther) {
    // if (pOther.mass > this.mass) {
    //   console.log('try eat fatty.')
    //   return
    // }
    // if (this.dead) {
    //   console.log('try self revive.')
    //   return
    // }
    // if (pOther.dead) {
    //   console.log('try eat dead.')
    //   return
    // }
    if (pOther.mass < this.mass && !this.dead && !pOther.dead) {
      // m1 * v1 + m2 * v2 = (m1 + m2) * v'
      const newVelovity = this.velocity.multiply(this.mass).add(pOther.velocity.multiply(pOther.mass)).divide(this.mass + pOther.mass)
      this.velocity = newVelovity
      this.mass += pOther.mass
      this.radius = Particle.massToRadius(this.mass)
      pOther.dead = true
    }
  }

  outOfScreen() {
    return this.position.x + this.radius < 0 || this.position - this.radius > window.__width ||
      this.y + this.radius < 0 || this.y - this.radius > window.__height
  }
}

/**
 * @param {Particle} a
 * @param {Particle} b
 */
Particle.distancePow2 = function (a, b) {
  return Math.pow(a.position.x - b.position.x, 2) + Math.pow(a.position.y - b.position.y, 2)
}
Particle.massToRadius = function (mass) {
  return Math.pow(mass, 1 / 24)
}
/**
 * @param {Particle} a
 * @param {Particle} b
 */
Particle.RocheLimitPow2 = function (a, b) {
  return Math.pow((a.radius + b.radius) * 2.423, 2)
}

class WorkerFlow {
  constructor(fileName) {
    this.worker = new Worker(fileName)
  }

  async onmessage() {
    return await (new Promise(resolve => {
      this.worker.onmessage = e => resolve(e.data)
    }))
  }

  async sendAndRecieve(data) {
    // console.log(`SAR ${data.type} ${data.index} enter ${new Date().getTime()}`)
    this.worker.postMessage(data)
    const receipt = await this.onmessage()
    // console.log(`SAR ${data.type} ${data.index} leave ${new Date().getTime()}`)
    return receipt
  }

  /**
   * @param {Transferable} transferable
   */
  async transferAndRetrieve(transferable) {
    // const data = new Float64Array(transferable.slice())
    // console.log(`TAR [${data[0]}] type ${data[2]} enter ${new Date().getTime()}`)
    this.worker.postMessage(transferable, [transferable])
    const receipt = await this.onmessage()
    // console.log(`TAR [${data[0]}] type ${data[2]} leave ${new Date().getTime()}`)
    return receipt
  }
}

class ParticleSystem {
  /**
   * @param {CanvasRenderingContext2D} ctx
   * @param {CanvasRenderingContext2D} ctxBg
   */
  constructor(ctx, ctxBg, canvasW, canvasH) {
    /**
     * @type {WorkerFlow[]}
     */
    this.workers = []
    if (window.__multi_thread) {
      for (let i = 0; i < navigator.hardwareConcurrency; i++) {
        // for (let i = 0; i < 3; i++) {
        this.workers.push(new WorkerFlow(window.__worker_file_name))
      }
    }
    this.displayWorker()
    /**
     * @type {Particle[]}
     */
    this.particles = []
    this.effectors = []
    this.context = ctx
    this.contextBg = ctxBg

    this.canvasWH = [canvasW, canvasH]

    this.pauseSignal = false

    this.inner_p_count = 0

    this.pCount = 0

    this.lastRenderTime = new Float64Array(1024)

    this.inner_render_interval = 0

    if (!window.__ps) window.__ps = this

    this.TotalParticleAmountTextStyle = {
      p: new Vector2(10, 18),
      lt: new Vector2(0, 18 - window.__fontsz),
      rb: new Vector2(180, 22),
      s: 'rgba(32,32,32,.8)'
    }

    this.FramePerSecondTextStyle = {
      p: new Vector2(1330, 18),
      lt: new Vector2(1328, 18 - window.__fontsz),
      rb: new Vector2(1400, 22),
      s: '#67C23A'
    }

    this.MultiThreadStatusTextStyle = {
      p: new Vector2(1202, 18),
      lt: new Vector2(1200, 18 - window.__fontsz),
      rb: new Vector2(1320, 22)
    }

    // this.TotalMomentumTextStyle = {
    //   p: new Vector2(1052, 18),
    //   lt: new Vector2(1050, 18 - window.__fontsz),
    //   rb: new Vector2(1198, 22),
    //   s: '#409EFF'
    // }

    // const momentum = function (particles, style) {
    //   //console.time('Momentum cal')
    //   const P = k_m_Formatter(+particles.reduce((pv, cv) => !cv.dead ? pv + cv.mass * cv.velocity.length() : pv, 0).toFixed(1), 3)
    //   //console.timeEnd('Momentum cal')
    //   showHint(window.__ctxText, `total P  ${P}`, style.p, style.lt, style.rb, style.s)
    //   window.requestAnimationFrame(() => momentum(particles, style))
    // }
    // momentum(this.particles, this.TotalMomentumTextStyle)

    // this.TotalMassTextStyle = {
    //   p: new Vector2(902, 18),
    //   lt: new Vector2(900, 18 - window.__fontsz),
    //   rb: new Vector2(1048, 22),
    //   s: '#409EFF'
    // }

    // const mass = function (particles, style) {
    //   const M = k_m_Formatter(+particles.reduce((pv, cv) => !cv.dead ? pv + cv.mass : pv, 0).toFixed(1), 3)
    //   showHint(window.__ctxText, `total M  ${M}`, style.p, style.lt, style.rb, style.s)
    //   window.requestAnimationFrame(() => mass(particles, style))
    // }
    // mass(this.particles, this.TotalMassTextStyle)

    // this.quadTree = new QuadTree(new Rectangle(Vector2.zero, new Vector2(window.__width, window.__height)))
  }

  increaseWorker() {
    this.pauseSignal = true
    this.workers.push(new WorkerFlow(window.__worker_file_name))
    this.pauseSignal = false
    this.displayWorker()
    return true
  }

  decreaseWorker() {
    if (this.workers.length <= 1) return false
    this.pauseSignal = true
    this.workers[this.workers.length - 1].worker.terminate()
    this.workers.splice(this.workers.length - 1, 1)
    this.pauseSignal = false
    this.displayWorker()
    return true
  }

  displayWorker() {
    showHint(window.__ctxText, `worker: ${this.workers.length}`, new Vector2(240, 18), new Vector2(238, 18 - window.__fontsz), new Vector2(340, 22), '#606266')
  }

  get threadsCount() {
    return this.workers.length
  }

  /**
   * @param {number} hint 1 - devour-sub-task 2 - gravitation-sub-task
   */
  particlesToBinary(index, total, hint) {
    //console.time('particlesToBinary')

    // particle -> <px,py,vx,vy,ax,ay,m,r>
    const ret = new Float64Array(8 * this.particles.length + 3)
    const t = []
    this.particles.forEach(p => t.push(p.position.x, p.position.y, p.velocity.x, p.velocity.y, p.acceleration.x, p.acceleration.y, p.mass, p.radius))
    ret.set([index, total, hint, ...t])

    //console.timeEnd('particlesToBinary')
    return ret
  }

  get pCount() {
    return this.inner_p_count
  }

  set pCount(v) {
    this.inner_p_count = v
    window.requestAnimationFrame(() => {
      showHint(window.__ctxText, `total particles: ${v}`, this.TotalParticleAmountTextStyle.p, this.TotalParticleAmountTextStyle.lt, this.TotalParticleAmountTextStyle.rb, this.TotalParticleAmountTextStyle.s)
    })
  }

  get renderInterval() {
    return this.inner_render_interval
  }

  set renderInterval(v) {
    this.inner_render_interval = v
    updateFps('fps: ' + (1000 / v).toFixed(1), this.FramePerSecondTextStyle)
  }

  get useMultiThread() {
    return this.particles.length > this.threadsCount * 1 && window.__multi_thread
  }

  /**
   * @param {Particle} particle 
   */
  emit(particle) {
    this.particles.push(particle)
    ++this.pCount

    // this.quadTree.insert(particle)
  }

  clearCtx() {
    this.context.clearRect(0, 0, __width, __height)
  }

  /**
   * @param {number} index 
   */
  remove(index) {
    if (!this.particles[index].dead) {
      console.log('try remove undead.')
      return
    }
    // this.quadTree.remove(this.particles[index])
    this.particles.splice(index, 1)
    --this.pCount
  }

  removeAll() {
    this.pauseSignal = true
    this.workers.forEach(w => w.worker.terminate())
    this.particles = this.particles.splice(0, this.particles.length - 1)
    this.pCount = 0
    this.clearCtx()
  }

  get totalMass() {
    return this.particles.reduce((p, v) => p + v.mass, 0)
  }

  applyEffectors() {
    // this.quadTree.refresh()

    for (const effector of this.effectors) {
      const apply = effector.apply
      for (const p of this.particles)
        apply(p)
    }
  }

  /**
   * @param {number} dt
   */
  kinematics(dt) {
    for (const particle of this.particles) {

      if (particle.stasis) {
        particle.acceleration = particle.velocity = Vector2.zero
        continue
      }

      const beforeMovePosition = particle.position
      particle.position = particle.position.add(particle.velocity.multiply(dt))
      particle.velocity = particle.velocity.add(particle.acceleration.multiply(dt))

      // render path
      if (window.__s_path && !particle.outOfScreen()) {
        this.contextBg.strokeStyle = particle.color.toRgba(0.5)
        this.contextBg.beginPath()
        this.contextBg.moveTo(beforeMovePosition.x, beforeMovePosition.y)
        this.contextBg.lineTo(particle.position.x, particle.position.y)
        this.contextBg.stroke()
      }

      if (window.__sv_log) console.log(`p ${particle.id} v: <${particle.velocity.x}, ${particle.velocity.y}> (${particle.velocity.length()})`)
    }
  }

  devour() {
    this.particles.sort((a, b) => b.mass - a.mass).forEach((p, selfIndex, particlesRef) => {

      const foodCandidateIndex = []

      particlesRef
        .filter((pOther, innerIndex) => {

          if (p.mass <= pOther.mass) return
          if (innerIndex === selfIndex) return

          const canEat = Particle.distancePow2(p, pOther) < Particle.RocheLimitPow2(p, pOther)

          if (canEat) {
            foodCandidateIndex.push(innerIndex)
          }

          return canEat
        })
        .forEach(foodP => {
          p.devourOther(foodP)
        })
      
      foodCandidateIndex.forEach(beEatenIndex => this.remove(beEatenIndex))
    })
    
    this.particles.forEach((p, index) => {
      if (p.dead) {
        this.remove(index)
      }
    })
  }

  async devourMultiThread() {
    this.particles.sort((a, b) => b.mass - a.mass)

    const resultSet = await Promise.all(this.workers.map((w, index) => w.transferAndRetrieve(this.particlesToBinary(index, this.threadsCount, 1).buffer)))

    //console.log('---- devourMultiThread debug ----')
    // console.log('transferAndRetrieve raw', resultSet)
    for (const resultSetPiece of resultSet) {
      const ret = new Uint32Array(resultSetPiece)
      // console.log('transferAndRetrieve', ret)
      if (ret.length === 0 || ret[0] !== 4294967294) {
        continue
      }

      //console.log('detect devour', ret)

      let eater = -1
      for (let i = 0; i < ret.length; i++) {
        if (ret[i] === 4294967295) {
          break
        }
        if (ret[i] === 4294967294) {
          eater = ret[++i]
        }
        else {
          //console.log(`main thread [${eater}]${this.particles[eater].id} try eat [${ret[i]}]${this.particles[ret[i]].id}`)
          this.particles[eater].devourOther(this.particles[ret[i]])
        }
      }

    }
    
    this.particles.forEach((p, index) => {
      if (p.dead) {
        this.remove(index)
      }
    })
    
  }

  universalGravitation() {
    this.particles.forEach((p, index) => {

      const totalGravitation = this.particles.reduce((pv, cv, innerIndex) => {
        if (innerIndex === index) {
          return pv
        }
        else {
          const gravAcc = ParticleSystem.G * (cv.mass * 1000) / Particle.distancePow2(p, cv)
          const gravVec = Vector2.unit(cv.position.x - p.position.x, cv.position.y - p.position.y).multiply(gravAcc)
          return pv.add(gravVec)
        }
      }, Vector2.zero)

      p.acceleration = totalGravitation

      if (window.__sac_log) console.log(`p ${p.id} get new acc: <${p.acceleration.x}, ${p.acceleration.y}> (${p.acceleration.length()})`)

    })
  }

  async universalGravitationMultiThread() {

    const resultSet = await Promise.all(this.workers.map((w, index) => w.transferAndRetrieve(this.particlesToBinary(index, this.threadsCount, 2).buffer)))
    
    for (const resultSetPiece of resultSet) {

      const result = new Float64Array(resultSetPiece)
      // console.log('universalGravitationMultiThread::result', result)
      for (let i = 0; i < result.length - 3; i += 3) {
        this.particles[result[i]].acceleration = new Vector2(result[i + 1], result[i + 2])
      }
    }

    return
  }

  /**
   * @param {number} dt
   */
  simulate(dt) {
    if (this.pauseSignal) return
    
    this.applyEffectors()

    this.devour()

    this.universalGravitation()

    this.kinematics(dt)
  }

  async simulateMultiThread(dt) {
    if (this.pauseSignal) return

    this.applyEffectors()

    if (!this.useMultiThread) {
      this.devour()
      this.universalGravitation()
    }
    else {
      await this.devourMultiThread()
      await this.universalGravitationMultiThread()
    }

    this.kinematics(dt)
  }

  render() {

    this.clearCtx()

    for (const p of this.particles) {

      if (p.outOfScreen()) continue

      this.context.fillStyle = p.color.toRgba(1)
      this.context.beginPath()
      this.context.arc(p.position.x, p.position.y, p.radius, 0, Math.PI * 2, true)
      this.context.closePath()
      this.context.fill()

      if (p.isSelected) {
        drawArrow(this.context, new Vector2(p.position.x - p.radius - 20, p.position.y), new Vector2(p.position.x - p.radius - 2, p.position.y), 30, 6, 2, p.color.toReversedRgba(1))
      }

      // debug, render the velocity of every particle
      if ((window.__sv && (Math.abs(p.velocity.x) > 0.1 || Math.abs(p.velocity.y) > 0.1)) || p.isSelected) {

        const cof = 20

        const endPoint = new Vector2(p.position.x + p.velocity.x / cof, p.position.y + p.velocity.y / cof)
        drawArrow(this.context, p.position, endPoint, 30, 3, 1, 'rgba(0,0,255,.3)')

        this.context.strokeStyle = 'rgba(0,0,255,.7)'
        this.context.strokeText(k_m_Formatter(p.velocity.length().toFixed(1)), endPoint.x, endPoint.y)
      }

      // debug, render the acceleration of every particle
      if ((window.__sa && (Math.abs(p.acceleration.x) > 0.1 || Math.abs(p.acceleration.y) > 0.1)) || p.isSelected) {

        const cof = 10

        const endPoint = new Vector2(p.position.x + p.acceleration.x / cof, p.position.y + p.acceleration.y / cof)
        drawArrow(this.context, p.position, endPoint, 30, 3, 1, 'rgba(255,0,0,.3)')

        this.context.strokeStyle = 'rgba(255,0,0,.8)'
        this.context.strokeText(k_m_Formatter(p.acceleration.length().toFixed(1)), endPoint.x, endPoint.y)
      }
    }

    const now = performance.now()
    const zeroIndex = this.lastRenderTime.findIndex(v => v === 0)
    const actualLength = zeroIndex === -1 ? this.lastRenderTime.length : zeroIndex + 1

    if (zeroIndex === -1) { // typed array is fulled
      this.lastRenderTime.set(this.lastRenderTime.subarray(1))
      this.lastRenderTime.set([now], this.lastRenderTime.length - 1)

      if (window.__fps_stt) updateFpsChart(this.lastRenderTime.subarray(4))
    }
    else {
      this.lastRenderTime.set([now], zeroIndex)

      if (window.__fps_stt) updateFpsChart(this.lastRenderTime.subarray(4, zeroIndex))
    }

    // console.log(actualLength)
    if (actualLength < 20) {
      this.renderInterval = (now - this.lastRenderTime[0]) / actualLength
    }
    else {
      this.renderInterval = (now - this.lastRenderTime[actualLength - 20]) / 20
    }

    updateMtStatus(`multi-thread ${this.useMultiThread ? 'on' : 'off'}`, this.MultiThreadStatusTextStyle, this.useMultiThread ? '#67C23A' : '#E6A23C')
  }

  checkAbnormal() {
    if (p.velocity.isNaN() || p.acceleration.isNaN()) {
      console.error('detect particle broken.')
      console.log(p)
      this.pauseSignal = true
      return false
    }
    return true
  }

  pauseAndResume() {
    this.pauseSignal = !this.pauseSignal

    document.getElementById('pause_resume').innerHTML = this.pauseSignal ? 'Resume' : 'Pause&nbsp;&nbsp;'
  }
}

ParticleSystem.G = 6.67408e-3
