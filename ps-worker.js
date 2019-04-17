importScripts('lodash.js', 'particle.js', 'calculator.js')

function Vlength(x, y) {
  return Math.sqrt(x * x + y * y)
}

function Vunit(x, y) {
  const dvd = Vlength(x, y)
  return { x: x / dvd, y: y / dvd }
}

function Vmultiply(V, f) {
  return {
    x: V.x * f,
    y: V.y * f
  }
}

onmessage = function (e) {
  // 来自转移所有权的字节消息
  if (e.data instanceof ArrayBuffer) {
    const data = new Float64Array(e.data)

    // --------------- web assembly test | devour ↓ ---------------
    if (data[2] === 1) {
      //console.time('wsam dv Module')
      // debugger
      const ret = Module._calculating_particle_devour(data)
      //console.log('CPP worker DV ret', ret)
      //console.timeEnd('wsam dv Module')
      
      //console.time('buffer copy')
      const buf = new Uint32Array(ret).buffer
      //console.timeEnd('buffer copy')

      postMessage(buf, [buf])
      return
    }
    else if (data[2] === 2) {
      // console.time('wsam ug Module')
      const ret = Module._calculating_universal_gravitation(data)
      // console.timeEnd('wsam ug Module')
      //console.log('CPP worker UG ret', ret)
      const buf = new Float64Array(ret).buffer
      postMessage(buf, [buf])
      return
    }
    else {
      throw new TypeError('wrong work load type')
    }
    // --------------- web assembly test | devour ↑ ---------------
  }
  else {
    throw new TypeError('wrong work load type')
  }
}
