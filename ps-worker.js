// importScripts('https://cdn.jsdelivr.net/npm/lodash@4.17.11/lodash.min.js', 'particle.js', 'calculator.js')
importScripts('calculator.js')

onmessage = function (e) {
  // 来自转移所有权的字节消息
  if (e.data instanceof ArrayBuffer) {
    const data = new Float64Array(e.data)
    // --------------- web assembly test | devour ↓ ---------------
    if (data[2] === 1) {
      const ret = Module._calculating_particle_devour(data)
      const buf = new Uint32Array(ret).buffer
      postMessage(buf, [buf])
      return
    }
    else if (data[2] === 2) {
      const ret = Module._calculating_universal_gravitation(data)
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
