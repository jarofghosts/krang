#!/usr/bin/env node

var c_proc = require('child_process'),
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
  this.emit('stopped')
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
