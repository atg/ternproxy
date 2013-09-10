var lizard = require('../lizard/lizard'),
    condense = require('../condense'),
    utils = require('../utils'),
    path = require('path'),
    tern = require('tern'),
    fs = require('fs')


var workspace = module.exports = function (dir, id, callback, tolerance) {
  if(!(this instanceof workspace)) return new workspace(dir, id, callback, tolerance)
  
  this.id = id
  this.cache = {}
  this.cache_index = {}
  this.dir = path.resolve(dir)
  this.tolerance = tolerance | 60000 //5m
  this.callback = callback
  this.extend()
  
  this.start(utils.get.config(this.dir))
  
  process.nextTick(function () {
    //this.lizard = lizard(this)
  }.bind(this))

  if(this.config.loadEagerly) config.loadEagerly.forEach(function (file) {
    this.tern.addFile(file)
  }.bind(this))
}

workspace.prototype.start = function (cfg) {
  this.defs = utils.find.defs(cfg.libs)
  utils.get.plugins(cfg.plugins)
  this.config = cfg

  if(utils.defined(this.tern)) this.tern.reset()

  this.tern = new tern.Server({
    getFile: utils.get.file,
    async: true,
    defs: this.defs,
    plugins: this.config.plugins,
    projectDir: this.dir
  })
}

workspace.prototype.extend = function () {
  if(this.timeout) clearTimeout(this.timeout)
  this.timeout = setTimeout(this.callback, this.tolerance)
}

workspace.prototype.file = function (id, text, name) {
  if(!id) return
  if(utils.defined(name)) this.cache_index[id] = name
  
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
    self.tern.delFile(self.cache_index[id])
    self.cache[id] = undefined
  }
}

workspace.prototype.condense = function (file, content, callback) {
  condense(workspace).call(this, file, content, this.dir, callback)
}

workspace.prototype.heuristics = function (heuristics) {
  if(this.config.defined) return
  
  var was_modified = false
  var that = this
  
  var plugin = function (plugin) {
    var is_defined = utils.defined(that.config.plugins[plugin])
    
    if(heuristics[plugin] < 0.5 && is_defined) {
      that.config.plugins[plugin] = undefined
      was_modified = true
    }
    
    if(heuristics[plugin] >= 0.5 && !is_defined) {
      that.config.plugins[plugin] = {}
      was_modified = true
    }
  }
  
  var lib = function (lib) {
    var pos = that.config.libs.indexOf(lib)
    var is_defined = pos >= 0
    
    if(heuristics[lib] < 0.5 && is_defined) {
      that.config.libs.splice(pos, 1);
      was_modified = true
    }
    
    if(heuristics[lib] >= 0.5 && !is_defined) {
      that.config.libs.push(lib)
      was_modified = true
    }
  }
  
  Object.keys(heuristics).forEach(function (heuristic) {
    if(['node', 'requirejs'].indexOf(heuristic) >= 0) plugin(heuristic)
    else lib(heuristic)
  })
  
  if(was_modified) that.start(that.config)
}