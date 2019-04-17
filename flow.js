window.__height = 920
window.__width = 1400

function run(multi_thread) {
  window.__multi_thread = multi_thread
  window.__worker_file_name = 'ps-worker.js'
  start(init, multi_thread ? globalRenderLoopAsync : globalRenderLoop)
}

/**
 * @type {(() => void)[]}
 */
const extraTasksQueue = []
/**
 * @param {HTMLCanvasElement} canvas
 * @param {CanvasRenderingContext2D} ctx
 * @param {CanvasRenderingContext2D} ctxB
 * @param {CanvasRenderingContext2D} ctxT
 */
function init(canvas, ctx, ctxB, ctxT) {
  /**
   * for text hint
   * @type {CanvasRenderingContext2D}
   */
  const ctxText = document.getElementById('canvas_text_hint').getContext('2d')
  window.__fontsz = 14
  ctxText.font = `lighter ${__fontsz}px TimesNewRoman`
  window.__ctxText = ctxText

  const ps = new ParticleSystem(ctx, ctxB, canvas.width, canvas.height)

  // debug pre-placed particle
  //ps.emit(new Particle(new Vector2(400, 400), new Vector2(0, 265), Color.random(), 1000, 'p1'))
  //ps.emit(new Particle(new Vector2(__width / 2, __height / 2), Vector2.zero, Color.random(), 1e7, 'giant', true))
  // ps.emit(new Particle(new Vector2(__width / 2, __height / 2), Vector2.zero, Color.black, 1e8, 'black hole', true))

  // ps.emit(new Particle(new Vector2(500 - 200, 400 + 200), Vector2.zero, Color.random(), 10000000, 'gl', true))
  // ps.emit(new Particle(new Vector2(500 + 200, 400 + 200), Vector2.zero, Color.random(), 10000000, 'gr', true))

  // const p = 352.78640450004207
  // ps.emit(new Particle(new Vector2(500, p), Vector2.zero, Color.random(), 10000000, 'gr', true))
  
  //ps.emit(new Particle(new Vector2(500, 600 - Math.pow(3, 0.5) * 400 / 6 + 100), new Vector2(0, 0), Color.black, 1000, 's'))
  

  let i = -1
  const SPTP = {
    p: new Vector2(10, 42),
    lt: new Vector2(0, 42 - window.__fontsz),
    rb: new Vector2(1300, 46),
    s: 'rgba(32,32,32,.8)'
  }

  canvas.onmousedown = function(e1) {
    const position = new Vector2(e1.offsetX, e1.offsetY)

    const selectedP = ps.particles.find(p => p.position.equal(position, p.radius))

    if (selectedP) {
      if (selectedP.isSelected) {
        selectedP.isSelected = false
        showHint(ctxText, '', SPTP.p, SPTP.lt, SPTP.rb, SPTP.s)
        extraTasksQueue.splice(extraTasksQueue.findIndex(fx => fx.name === 'reportSelectedParticle'), 1)
        return
      }
      canvas.onmouseup = null

      ps.particles.forEach(p => p.isSelected = false)
      selectedP.isSelected = true

      console.log('selectedP', selectedP)

      const oldOneIndex = extraTasksQueue.findIndex(fx => fx.name === 'reportSelectedParticle')
      if (oldOneIndex !== -1) {
        extraTasksQueue.splice(oldOneIndex, 1)
      }

      extraTasksQueue.push(function () {
        return function reportSelectedParticle() {
          if (selectedP.dead) {
            const info = `selected: target dead, lost track`
            showHint(ctxText, info, SPTP.p, SPTP.lt, SPTP.rb, SPTP.s)
            extraTasksQueue.splice(extraTasksQueue.findIndex(fx => fx.name === 'reportSelectedParticle'), 1)
            return
          }
          const info = `selected: id:${selectedP.id}, mass:${US_Formatter.format(+selectedP.mass.toFixed(0))}, radius:${selectedP.radius.toFixed(2)}, V:<${selectedP.velocity.x.toFixed(1)},${selectedP.velocity.y.toFixed(1)}> [${selectedP.velocity.length().toFixed(1)}], a:<${selectedP.acceleration.x.toFixed(1)},${selectedP.acceleration.y.toFixed(1)}> [${selectedP.acceleration.length().toFixed(1)}]`
          showHint(ctxText, info, SPTP.p, SPTP.lt, SPTP.rb, SPTP.s)
        }
      }())
    }
    else {
      canvas.onmousemove = _.debounce(function (em) {
        ctxT.clearRect(0, 0, __width, __height)
        drawArrow(ctxT, new Vector2(e1.offsetX, e1.offsetY), new Vector2(em.offsetX, em.offsetY), 30, 10, 1, 'rgba(64,158,255,1)')
      }, 1)

      canvas.onmouseup = function (e2) {

        ctxT.clearRect(0, 0, __width, __height)
        canvas.onmousemove = null

        const mass = +(document.getElementById('mass_value').value)

        if (isNaN(mass)) {
          console.error('bad mass inputed.')
          return
        }

        const particle = new Particle(position, new Vector2(e2.offsetX - e1.offsetX, e2.offsetY - e1.offsetY), Color.random(), +mass, ++i)
        ps.emit(particle)
      }
    }
  }

  return ps
}

/**
 * @param {ParticleSystem} ps
 */
function globalRenderLoop(ps, dt) {
  //console.time('simulate')
  ps.simulate(dt)
  //console.timeEnd('simulate')
  
  ps.render()

  extraTasksQueue.forEach(t => t(ps))
}

/**
 * @param {ParticleSystem} ps
 */
async function globalRenderLoopAsync(ps, dt) {
  // console.time('simulate-mt')
  await ps.simulateMultiThread(dt)
  // console.timeEnd('simulate-mt')
  await sleep(1)

  ps.render()

  extraTasksQueue.forEach(t => t(ps))
}

/**
 * 
 * @param {(cvs: HTMLCanvasElement, ctx: CanvasRenderingContext2D, ctx2: CanvasRenderingContext2D) => ParticleSystem} initFunc
 * @param {(ps: ParticleSystem, dt: number) => void || (ps: ParticleSystem, dt: number) => Promise<void>} renderFunc
 */
function start(initFunc, renderFunc) {

  window.__sa = false
  window.__sv = false
  window.__sac_log = false
  window.__sv_log = false
  window.__s_path = false
  window.__sm = false
  initGlobalDifferentialOfTime(0.001)

  window.__stable_render = false

  window.onkeydown = e => {
    if (e.key === '1') addMess()
  }

  /**
   * @type {HTMLCanvasElement}
   */
  const canvas = document.getElementById('canvas_elem')
  const ctx = canvas.getContext('2d')
  /**
   * @type {HTMLCanvasElement}
   */
  const canvasBg = document.getElementById('canvas_bg')
  const ctxBg = canvasBg.getContext('2d')

  /**
   * @type {HTMLCanvasElement}
   */
  const canvasTemp = document.getElementById('canvas_mouse_e')
  const ctxTp = canvasTemp.getContext('2d')

  ctx.font = 'lighter 7px TimesNewRoman'
  ctxBg.font = 'lighter 7px TimesNewRoman'

  const ps = initFunc(canvas, ctx, ctxBg, ctxTp)

  // ps.effectors.push(new Gravity(new Vector2(0, 1e3)))
  // ps.effectors.push(new ChamberBox())
  // ps.effectors.push(new BlackHoleEdge())
  // ps.effectors.push(new LoopWorld())

  /**
   * @param {ParticleSystem} ps 
   */
  const fx_render_mass = ps => {
    if (!window.window.__sm) return
    ps.particles.forEach(p => {
      if (p.outOfScreen()) return
      ps.context.strokeStyle = 'rgba(0,0,0,.5)'
      ps.context.strokeText(k_m_Formatter(Math.round(p.mass)), p.position.x + p.radius, p.position.y - p.radius)
    })
  }
  extraTasksQueue.push(fx_render_mass)

  if (renderFunc.constructor.name === 'AsyncFunction') {
    const loop = function () {
      renderFunc(ps, window.__differentialOfTime).then(() => {
        if (window.__stable_render) window.requestAnimationFrame(loop)
        else loop()
      })
    }

    loop()
  }
  else {
    const loop = function () {
      renderFunc(ps, window.__differentialOfTime)
      if (window.__stable_render) window.requestAnimationFrame(loop)
    }

    if (window.__stable_render) loop()
    else setInterval(loop, 0)
  }

  window.__echart_inst = window.echarts.init(document.getElementById('fps_frame'), {}, { width: 500, height: 500 })
  window.__fps_stt = true
}

// html affairs

function initGlobalDifferentialOfTime(initV) {
  window.__differentialOfTime = initV
  setTimeout(() => {
    document.getElementById('sim_speed').textContent = initV
    document.getElementById('dot_rang').value = initV
  }, 4)
}

function setGlobalDifferentialOfTime(newV) {
  window.__differentialOfTime = newV
  document.getElementById('sim_speed').textContent = newV
}

function addMess(count) {
  console.time('add mess ' + count)
  const O = new Vector2(__width / 2, __height / 2)
  const R = Math.min(__height, __width) / 2 - 50

  __ps.emit(new Particle(
    O,
    Vector2.zero,
    Color.red,
    10 * count,
    'CenterO'))

  for (let i = 0; i < count; i++) {
    // (x - a)^2 + (y - b)^2 = r^2
    // y = (r^2 - (x - a)^2)^0.5 + b || b - (r^2 - (x - a)^2)^0.5
    const randomX = _.random(__width / 2 - R, __width / 2 + R, true)
    const randomY = _.random(__height / 2 - Math.pow(R * R - Math.pow(randomX - __width / 2, 2), 0.5), Math.pow(R * R - Math.pow(randomX - __width / 2, 2), 0.5) + __height / 2, true)
    const P = new Vector2(randomX, randomY)
    __ps.emit(new Particle(
      P,
      O.subtract(P).rotate(Math.PI / 2, Vector2.zero).normalize().multiply(NormalDistribution(400, 200)),
      Color.random(),
      _.random(10, 1000, true),
      /*'mess' + +new Date()*/))
  }
  console.timeEnd('add mess ' + count)
}

function addRandom(count) {
  for (let i = 0; i < count; i++) {
    __ps.emit(new Particle(
      new Vector2(_.random(0, __width, true), _.random(0, __height, true)),
      new Vector2(_.random(-20, 20, true), _.random(-20, 20, true)),
      Color.random(),
      _.random(10, 10000, true)))
  }
}

function pause_resume() {
  __ps.pauseAndResume()
}

function stable_fast_mode() {
  document.getElementById('stable_fast').innerHTML = window.__stable_render ? 'Vertical Sync on' : 'Vertical Sync off'
  window.__stable_render = !window.__stable_render
}

function switch_fps_statistic() {
  if (window.__fps_stt) {
    window.__echart_inst.dispose()
  }
  else {
    window.__echart_inst = window.echarts.init(document.getElementById('fps_frame'), {}, { width: 500, height: 500 })
  }
  window.__fps_stt = !window.__fps_stt
  document.getElementById('show_hide_ftpstt').textContent = window.__fps_stt ? 'Fps Statistic off' : 'Fps Statistic on'
}

/**
 * @param {string} vName
 * @param {HTMLSpanElement} htmlNode
 * @param {string} offText
 * @param {string} onText
 */
function showButtonHandler(vName, htmlNode, offText, onText, otherTask = new Function()) {
  window[vName] = !window[vName]
  if (window[vName]) {
    htmlNode.textContent = offText
  }
  else {
    htmlNode.textContent = onText
  }

  otherTask()
}

function __debug() {
  __ps.emit(new Particle(new Vector2(_.random(0, __width, true), _.random(0, __height, true)), new Vector2(_.random(-10, 10, true), _.random(-10, 10, true)), Color.random(), 1000, 'p1'))
  __ps.emit(new Particle(new Vector2(_.random(0, __width, true), _.random(0, __height, true)), new Vector2(_.random(-10, 10, true), _.random(-10, 10, true)), Color.random(), 1000, 'p2'))
  __ps.emit(new Particle(new Vector2(_.random(0, __width, true), _.random(0, __height, true)), new Vector2(_.random(-10, 10, true), _.random(-10, 10, true)), Color.random(), 1000, 'p3'))
  __ps.emit(new Particle(new Vector2(_.random(0, __width, true), _.random(0, __height, true)), new Vector2(_.random(-10, 10, true), _.random(-10, 10, true)), Color.random(), 1000, 'p4'))
  __ps.emit(new Particle(new Vector2(_.random(0, __width, true), _.random(0, __height, true)), new Vector2(_.random(-10, 10, true), _.random(-10, 10, true)), Color.random(), 1000, 'p5'))
  __ps.emit(new Particle(new Vector2(_.random(0, __width, true), _.random(0, __height, true)), new Vector2(_.random(-10, 10, true), _.random(-10, 10, true)), Color.random(), 1000, 'p6'))
  // __ps.emit(new Particle(new Vector2(400, 400), new Vector2(0, 0), Color.random(), 100000, 'p1'))
  // __ps.emit(new Particle(new Vector2(400.6, 400.6), new Vector2(0, 0), Color.random(), 100000, 'p2'))
  // __ps.emit(new Particle(new Vector2(402, 402), new Vector2(0, 0), Color.random(), 1000, 'p3'))
  // __ps.emit(new Particle(new Vector2(403, 403), new Vector2(0, 0), Color.random(), 1000, 'p4'))
  // __ps.emit(new Particle(new Vector2(404, 404), new Vector2(0, 0), Color.random(), 1000, 'p5'))
}

function __destory() {
  __ps.removeAll()
}
