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
  this.current_environment = this.config.environment || {}
  this.name = this.config.name || this.dir
  this.running = false

  return this
}

util.inherits(Krang, EE)

Krang.prototype.start = function () {
  if (this.running) return this.error('Already running')
  this.running = true
  for (var i = 0, l = this.config.processes.length; i < l; ++i) {
    var this_process = this.config.processes[i],
        command = this_process.command.split(' '),
        type = this_process.type || 'run_once'
        cmd_options = {}
    cmd_options.env = this.current_environment
    this_process.working_dir && cmd_options.cwd = this_process.working_dir
    this_process.user_id && cmd_options.uid = this_process.user_id
    this_process.group_id && cmd_options.gid = this_process.group_id

    var spawned = spawn(command[0], command.splice(1), cmd_options)
    if (type == 'static' || type == 'dynamic') this.register(this_process.name || this_process.command, type, spawned)
  }
  this.emit('started')
}

Krang.prototype.register_process = function (process_name, 

Krang.prototype.error = function (err_string) {
  this.emit('error', new Error(err_string))
}

Krang.prototype.refresh = function () {

}

Krang.prototype.stop = function () {
  var all_processes = this.static_processes.concat(this.dynamic_processes),
      countdown = all_processes.length

  this.once('stopped', function () { this.running = false }.bind(this))

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
