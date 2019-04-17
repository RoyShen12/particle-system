/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {Vector2} from
 * @param {Vector2} to
 * @param {number} theta 箭头夹角 角度
 * @param {number} headlen 箭头长度
 */
function drawArrow(ctx, from, to, theta, headlen, width, color) {
  theta = theta || 30
  headlen = headlen || 10
  width = width || 1
  color = color || '#000'

  const angle = Math.atan2(from.y - to.y, from.x - to.x) * 180 / Math.PI
  const angle1 = (angle + theta) * Math.PI / 180, angle2 = (angle - theta) * Math.PI / 180
  const topX = headlen * Math.cos(angle1)
  const topY = headlen * Math.sin(angle1)
  const botX = headlen * Math.cos(angle2)
  const botY = headlen * Math.sin(angle2)

  ctx.save()

  ctx.beginPath()

  let arrowX = from.x - topX
  let arrowY = from.y - topY

  ctx.moveTo(arrowX, arrowY)
  ctx.moveTo(from.x, from.y)
  ctx.lineTo(to.x, to.y)

  arrowX = to.x + topX
  arrowY = to.y + topY

  ctx.moveTo(arrowX, arrowY)
  ctx.lineTo(to.x, to.y)
  arrowX = to.x + botX
  arrowY = to.y + botY
  ctx.lineTo(arrowX, arrowY)

  ctx.strokeStyle = color
  ctx.lineWidth = width
  ctx.stroke()

  ctx.restore()
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

const US_Formatter = new Intl.NumberFormat('en-US')

function k_m_Formatter(num, precise = 1) {
  if (Math.abs(num) <= 999) {
    return num
  }
  else if (Math.abs(num) <= 999999) {
    return Math.sign(num) * ((Math.abs(num) / 1000).toFixed(precise)) + ' k'
  }
  else if (Math.abs(num) <= 999999999) {
    return Math.sign(num) * ((Math.abs(num) / 1000000).toFixed(precise)) + ' m'
  }
  else {
    return US_Formatter.format(Math.sign(num) * ((Math.abs(num) / 1000000000).toFixed(precise))) + ' b'
  }
}

/**
 * 
 * @param {CanvasRenderingContext2D} ctx
 * @param {string} text 
 * @param {Vector2} p 
 * @param {Vector2} clearLT
 * @param {Vector2} clearRB
 * @param {string} style 
 */
function showHint(ctx, text, p, clearLT, clearRB, style = 'rgba(0,0,0,.5)') {
  // console.log(clearLT.x, clearLT.y, clearRB.x, clearRB.y)
  ctx.clearRect(clearLT.x, clearLT.y, clearRB.x - clearLT.x, clearRB.y - clearLT.y)
  ctx.strokeStyle = style
  if (window.debug_txt_area) ctx.strokeRect(clearLT.x, clearLT.y, clearRB.x - clearLT.x, clearRB.y - clearLT.y)
  ctx.strokeText(text, p.x, p.y)
}

const updateFps = _.throttle(function (t, p) {
  showHint(window.__ctxText, t, p.p, p.lt, p.rb, p.s)
}, 42)

const updateMtStatus = _.throttle(function (t, p, c) {
  showHint(window.__ctxText, t, p.p, p.lt, p.rb, c)
}, 1000)

/** @type {((RRIS: Float64Array) => void) & _.Cancelable} */
const updateFpsChart = _.throttle(function (RRIS) {
  if (window.__echart_inst && window.__echart_inst.isDisposed()) return

  const fpsData = RRIS.reduce((pv, v, idx, arrRef) => {
    if (idx < arrRef.length - 20) {
      pv.push(1000 / (arrRef[idx + 20] - v) * 20)
    }
    return pv
  }, [])

  const xAxis = [...RRIS.subarray(1).map(v => (v / 1000).toFixed(1))]
  
  window.__echart_inst.setOption({
    xAxis: {
      axisLabel: {
        fontSize: 10
      },
      name: 's',
      data: xAxis
    },
    yAxis: {
      name: 'FPS',
      splitNumber: 10,
      type: 'value',
      axisLabel: {
        fontSize: 10
      }
    },
    series: [
      {
        type: 'line',
        silent: true,
        smooth: false,
        symbol: 'none',
        lineStyle: {
          width: 1
        },
        itemStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              {
              offset: 0, color: '#67C23A'
              },
              {
                offset: 1, color: '#F56C6C'
              }
            ],
          }
        },
        data: fpsData
      }
    ]
  })
}, 1000)

function standardNormalDistribution() {
  const numberPool = []
  return function () {
    if (numberPool.length > 0) {
      return numberPool.pop()
    }
    else {
      const u = Math.random(), v = Math.random()
      const p = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
      const q = Math.sqrt(-2 * Math.log(u)) * Math.sin(2 * Math.PI * v)
      numberPool.push(q)
      return p
    }
  }()
}

function NormalDistribution(off, con) {
  const standard = standardNormalDistribution()
  return standard * con + off
}
