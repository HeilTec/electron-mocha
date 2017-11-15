let opts = window.__args__

if (!opts.interactive) {
  require('./console')
}

const grepFromSearch = window.location.search
  .slice(1)
  .split('&')
  .map(term => term.split('='))
  .filter(([item, value]) => item.match(/grep/))
  .map(([item, value]) => { 
    const opt = {}
    opt[item] = decodeURIComponent(value)
    return opt
  })
  .reduce((opts, opt) => Object.assign(opts, opt), {})

opts = Object.assign({}, opts, grepFromSearch)


const mocha = require('../mocha')
const { ipcRenderer: ipc } = require('electron')

// Expose mocha
window.mocha = require('mocha')

try {
  opts.preload.forEach((script) => {
    const tag = document.createElement('script')
    tag.src = script
    tag.async = false
    document.head.appendChild(tag)
  })
} catch (error) {
  ipc.send('mocha-error', {
    message: error.message,
    stack: error.stack
  })
}

ipc.on('mocha-start', () => {
  try {
    mocha.run(opts, (...args) => {
      ipc.send('mocha-done', ...args)
    })
  } catch ({ message, stack }) {
    ipc.send('mocha-error', { message, stack })
  }
})
window.addEventListener('beforeunload', function () {
  ipc.removeAllListeners('mocha-start')
})

// Request re-run on reload in --interactive mode
ipc.send('mocha-ready-to-run')
