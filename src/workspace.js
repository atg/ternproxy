var condense = require('tern/lib/condense'),
    utils = require('./utils'),
    log = require('./log'),
    path = require('path'),
    tern = require('tern'),
    fs = require('fs')


var workspace = module.exports = function (dir, id, callback, tolerance) {
  if(!(this instanceof workspace)) return new workspace(dir, id, callback, tolerance)
  
  var self = this
  
  self.id = id
  self.cache = {}
  self.dir = path.resolve(dir)
  self.tolerance = tolerance | 1800000 //30m
  self.config = utils.get.config(self.dir)
  self.defs = utils.find.defs(self.dir, self.config.libs)
  utils.get.plugins(self.config.plugins)
  self.callback = callback
  self.extend()
  
  self.tern = new tern.Server({
    getFile: utils.get.file,
    async: true,
    defs: self.defs,
    plugins: self.config.plugins,
    projectDir: self.dir
  })
  
  if(self.config.loadEagerly) config.loadEagerly.forEach(function (file) {
    self.tern.addFile(file)
  })
}

workspace.prototype.extend = function () {
  if(this.timeout) clearTimeout(this.timeout)
  this.timeout = setTimeout(this.callback, this.tolerance)
}

workspace.prototype.file = function (id, text) {
  if(!id) return
  
  if(this.cache[id]) clearTimeout(this.cache[id].timeout)
  
  if(arguments.length < 2 && !this.cache[id]) {
    this.file(id, '')
    return this.file(id)
  }
  
  if(arguments.length < 2) return this.cache[id].text
  
  this.cache[id] = {
    text: text,
    timeout: setTimeout(this.clean(id), this.tolerance)
  }
}

workspace.prototype.clean = function (id) {
  var self = this
  return function () {
    self.cache[id] = undefined
  }
}

workspace.prototype.condense = module.exports.condense = function (file, content, dir, callback) {
  var config = (function () {
    if(!(this instanceof workspace)) return {getFile: utils.get.file, async: true}
    
    var plugins = JSON.parse(JSON.stringify(this.config.plugins))
    plugins.node = undefined
    plugins = JSON.parse(JSON.stringify(plugins))
    
    return {
      getFile: utils.get.file,
      async: true,
      defs: this.defs,
      plugins: this.config.plugins,
      projectDir: this.dir
    }
  })(this)
  
  var server = new tern.Server(config)
  
  server.request({files: [{
    name: file,
    text: content,
    type: 'full'
  }]}, utils.noop)
  
  server.flush(function (e) {
    if(e) return callback(e)
    callback(null, condense.condense(file, file, {spans: true}))
  })
}