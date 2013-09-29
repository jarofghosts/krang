#!/usr/bin/env node

var c_proc = require('child_process'),
    util = require('util'),
    path = require('path'),
    argv = require('optimist')
    EE = require('events').EventEmitter

function Krang() {
  this.configuration = this.load_config()

  return this
}

util.inherits(Krang, EE)

Krang.prototype.load_config = function () {
  try {
    return require(path.join(process.cwd(), '.krang.json'))
  } catch (e) {
    return {}
  }
}
