'use strict'

const { workerData, parentPort } = require('worker_threads')
const { WRITE_INDEX, READ_INDEX } = require('./indexes')
const { waitDiff } = require('./wait')

const {
  dataBuf,
  stateBuf
} = workerData

let destination

const state = new Int32Array(stateBuf)
const data = Buffer.from(dataBuf)

async function start () {
  let fn
  try {
    fn = (await import(workerData.filename)).default
  } catch (error) {
    // A yarn user that tries to start a ThreadStream for an external module
    // provides a filename pointing to a zip file.
    // eg. require.resolve('pino-elasticsearch') // returns /foo/pino-elasticsearch-npm-6.1.0-0c03079478-6915435172.zip/bar.js
    // The `import` will fail to try to load it.
    // This catch block executes the `require` fallback to load the module correctly.
    // In fact, yarn modifies the `require` function to manage the zipped path.
    // More details at https://github.com/pinojs/pino/pull/1113
    // The error codes may change based on the node.js version (ENOTDIR > 12, ERR_MODULE_NOT_FOUND <= 12 )
    if ((error.code === 'ENOTDIR' || error.code === 'ERR_MODULE_NOT_FOUND') &&
     workerData.filename.startsWith('file://')) {
      fn = require(workerData.filename.replace('file://', ''))
    } else {
      throw error
    }
  }
  destination = await fn(workerData.workerData)

  destination.on('error', function (err) {
    parentPort.postMessage({
      code: 'ERROR',
      err
    })
  })

  destination.on('close', function () {
    // process._rawDebug('worker close emitted')
    const end = Atomics.load(state, WRITE_INDEX)
    Atomics.store(state, READ_INDEX, end)
    Atomics.notify(state, READ_INDEX)
    setImmediate(() => {
      process.exit(0)
    })
  })
}

// No .catch() handler,
// in case there is an error it goes
// to unhandledRejection
start().then(function () {
  parentPort.postMessage({
    code: 'READY'
  })

  process.nextTick(run)
})

function run () {
  const current = Atomics.load(state, READ_INDEX)
  const end = Atomics.load(state, WRITE_INDEX)

  // process._rawDebug(`pre state ${current} ${end}`)

  if (end === current) {
    if (end === data.length) {
      waitDiff(state, READ_INDEX, end, Infinity, run)
    } else {
      waitDiff(state, WRITE_INDEX, end, Infinity, run)
    }
    return
  }

  // process._rawDebug(`post state ${current} ${end}`)

  if (end === -1) {
    // process._rawDebug('end')
    destination.end()
    return
  }

  const toWrite = data.toString('utf8', current, end)
  // process._rawDebug('worker writing: ' + toWrite)

  const res = destination.write(toWrite)

  if (res) {
    Atomics.store(state, READ_INDEX, end)
    Atomics.notify(state, READ_INDEX)
    setImmediate(run)
  } else {
    destination.once('drain', function () {
      Atomics.store(state, READ_INDEX, end)
      Atomics.notify(state, READ_INDEX)
      run()
    })
  }
}

process.on('unhandledRejection', function (err) {
  parentPort.postMessage({
    code: 'ERROR',
    err
  })
  process.exit(1)
})

process.on('uncaughtException', function (err) {
  parentPort.postMessage({
    code: 'ERROR',
    err
  })
  process.exit(1)
})
