#!/usr/bin/env node

var spawn = require('child_process').spawn,
    util = require('util'),
    levelup = require('levelup'),
    mkdirp = require('mkdirp'),
    fs = require('fs'),
    path = require('path'),
    EE = require('events').EventEmitter,
    is_cli = (require.main === module)

function load_config(dir) {
  try {
    return require(path.join(path.normalize(dir), '.krang.json'))
  } catch (e) {
    return {}
  }
}
function load_db() {
  return levelup(path.join(path.normalize(process.env.HOME || process.env.USERPROFILE), '.krang'))
}
function timestamp() {
  var date = new Date(),
      hour = ('0' + date.getHours()).slice(-2),
      minutes = ('0' + date.getMinutes()).slice(-2),
      seconds = ('0' + date.getSeconds()).slice(-2)
  return ['[', hour, ':', minutes, ':', seconds, ']'].join('')
}
function Krang(dir) {
  this.dir = dir || process.cwd()
  this.config = load_config(this.dir)
  this.db = load_db()
  this.static_processes = {}
  this.dynamic_processes = {}
  this.current_environment = this.config.environment || {}
  this.name = this.config.name || this.dir
  this.running = false

  return this
}

util.inherits(Krang, EE)

Krang.prototype.start = function () {
  if (this.running) return this.error('Already running')
  mkdirp.sync(path.join(this.dir, '.krang'))
  this.running = true
  var processes = Object.keys(this.config.processes || {}),
      process_list = this.config.processes
  for (var i = 0, l = processes.length; i < l; ++i) {
    var process_name = processes[i],
        this_process = process_list[process_name],
        command = this_process.command.split(' '),
        type = this_process.type || 'run_once'
        cmd_options = {}
    this_process.working_dir && (cmd_options.cwd = path.resolve(process.cwd(), this_process.working_dir))
    this_process.user_id && (cmd_options.uid = this_process.user_id)
    this_process.group_id && (cmd_options.gid = this_process.group_id)

    this.start_process(process_name, command, cmd_options, type)
  }
  this.emit('started')
  setInterval(function () {}, 100)
}

Krang.prototype.start_process = function (name, command, options, type) {
  options.env = this.current_environment
  var spawned = spawn(command[0], command.splice(1), options)
  this.register_process(name, command, options, type, spawned)
}

Krang.prototype.register_process = function (name, command, options, type, the_process) {
  if (type == 'dynamic' || type == 'static') {
    this[type + '_processes'][name] = the_process
    process.on('close', this.start_process.bind(this, name, command, options, type))
  }
  the_process.on('error', function (err) { console.dir(err) })
  the_process.stdout.on('data', this.log_process.bind(this, name, 'out'))
  the_process.stderr.on('data', this.log_process.bind(this, name, 'error'))
}

Krang.prototype.change_var = function (env_key, value) {
  this.current_environment[env_key] = value
  this.refresh()
}

Krang.prototype.log_process = function (name, type, data) {
  if (!this.config.log || !!this.config.processes[name].no_log) return
  var filename = path.resolve(this.dir, '.krang', name + '.log'),
      filedata = timestamp() + ' [' + type.toUpperCase() + '] ' + data + '[END]'
  fs.appendFile(filename, filedata)
  this.emit('logged', name, filedata)
}

Krang.prototype.error = function (err_string) {
  this.emit('error', new Error(err_string))
}

Krang.prototype.refresh = function () {
  var processes = Object.keys(this.dynamic_processes),
      countdown = processes.length
  for (var i = 0; i < countdown; ++i) {
    var name = processes[i]
    this.kill_process(this.dynamic_processes[name], count_kill.bind(this))
  }

  function count_kill() {
    !--countdown && this.emit('refreshed')
  }
}

Krang.prototype.stop = function () {
  var names = Object.keys(this.dynamic_processes).concat(Object.keys(this.static_processes))
      countdown = names.length

  this.once('stopped', function () { this.running = false }.bind(this))

  for (var i = 0; i < countdown; ++i) {
    var process_name = names[i],
        process = this.dynamic_processes[process_name] || this.static_processes[process_name]
    this.kill_process(process, count_kill.bind(this))
  }

  function count_kill() {
    !--countdown && this.emit('stopped')
  }
}

Krang.prototype.kill_process = function (the_process, cb) {
  var sigkill_timeout = setTimeout(send_kill.bind(this, process), 1500)
  the_process.once('close', function () {
    sigkill_timeout && clearTimeout(sigkill_timeout)
    return cb(null, true)
  })
  function send_kill(process) {
    sigkill_timeout = 0
    the_process.kill('SIGKILL')
  }
}

Krang.prototype.restart = function () {
  this.once('stopped', this.start.bind(this))
  this.stop()
}

if (is_cli) {
  var argv = require('optimist').argv
  new Krang().start()
}
