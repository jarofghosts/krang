#!/usr/bin/env node

var spawn = require('child_process').spawn,
    util = require('util'),
    path = require('path'),
    EE = require('events').EventEmitter,
    is_cli = (require.main === module)

function load_config(dir) {
  try {
    return require(path.resolve(dir, '.krang.json'))
  } catch (e) {
    return {}
  }
}

function Krang(dir) {
  this.dir = dir || process.cwd()
  this.config = load_config(this.dir)
  this.static_processes = []
  this.dynamic_processes = []

  return this
}

util.inherits(Krang, EE)

Krang.prototype.start = function () {
  
  this.emit('started')
}

Krang.prototype.refresh = function () {

}

Krang.prototype.stop = function () {
  var all_processes = this.static_processes.concat(this.dynamic_processes),
      countdown = all_processes.length

  for (var i = 0; i < countdown; ++i) {
    this.kill_process(all_processes[i], count_kill.bind(this))
  }

  function count_kill() {
    !--countdown && this.emit('stopped')
  }
}

Krang.prototype.kill_process = function (process, cb) {
  var sigkill_timeout = setTimeout(send_kill.bind(this, process), 1500)
  process.once('close', function () {
    sigkill_timeout && clearTimeout(sigkill_timeout)
    return cb(null, true)
  })
  function send_kill(process) {
    sigkill_timeout = 0
    process.kill('SIGKILL')
  }
}

Krang.prototype.restart = function () {
  this.once('stopped', this.start.bind(this))
}

if (is_cli) {
  var argv = require('optimist').argv
}
