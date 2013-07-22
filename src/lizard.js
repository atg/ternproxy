var condense = require('./condense')(null, true),
    interpolate = require('util').format,
    utils = require('./utils'),
    async = require('async'),
    log = require('./log'),
    path = require('path'),
    fs = require('fs')

var save_file = path.join(__dirname, '../node_modules/tern/defs', '%s.json')
var defs_dir = path.join(__dirname, '../node_modules/tern/defs')
var tern_libs = fs.readdirSync(defs_dir).map(function (def) {
  return def.replace(/.json$/, '')
})

var bower = function (lizard) {
  if(!(this instanceof bower)) return new bower(lizard)

  var that = this
  this.lizard = lizard
  this.bower_file = path.join(lizard.workspace.dir, 'bower.json')
  this.dependencies_dir = path.join(lizard.workspace.dir, 'bower_components')
  this.analyzed = []

  fs.exists(that.bower_file, function (exists) {
    if(exists) that.read_conf(that.bower_file, function (e, config) {
      if(e) return log.onError(e)
      that.analize_conf(config)
    })
  })
  
  fs.exists(that.dependencies_dir, function (exists) {
    if(exists) that.read_dependencies_dir(that.dependencies_dir)
  })
}

bower.prototype.read_conf = function (file, callback) {
  var that = this

  fs.readFile(file, 'utf8', function (e, data) {
    if(e) return log.onError(e)
    try {var conf = JSON.parse(data)} catch (e) {callback(e)}
    callback(null, conf)
  })
}

bower.prototype.add_known_lib = function (name) {
  this.analyzed.push(name)
  this.lizard.workspace.config.libs.push(name)
  this.lizard.workspace.start(this.lizard.workspace.config)
}

bower.prototype.read_dependencies_dir = function (dir) {
  var that = this
  fs.readdir(dir, function (e, files) {
    files.forEach(that.read_dependency_conf, that)
  })
}

bower.prototype.add_main = function (main, name) {
  var that = this
  
  var script_files = main.map(function (file) {
    return path.resolve(that.dependencies_dir, name, file)
  })
  
  async.map(script_files, function (file, callback) {
    fs.readFile(file, 'utf8', callback)
  }, function (e, results) {
    if(e) return log.onError(e)
    that.analize_dependency(results.join(';;'), name)
  })
}

bower.prototype.analize_dependency = function (source, name) {
  if(this.analyzed.indexOf(name) >= 0) return
  var that = this
  
  condense(name, source, null, function (e, condense) {
    if(e) return log.onError(e)
    if(typeof condense !== 'object') return
    
    var file = interpolate(save_file, name)
    fs.writeFile(file, JSON.stringify(condense, null, 2), 'utf8', function (e) {
      if(e) return log.onError(e)
      that.add_known_lib(name)
    })
  })
}

bower.prototype.read_dependency_conf = function (dependency) {
  var that = this

  if(tern_libs.indexOf(dependency) >= 0) return that.add_known_lib(dependency)
  if(that.analyzed.indexOf(dependency) >= 0) return
  
  var dependency_conf_file = path.join(that.dependencies_dir, dependency, 'bower.json')
  fs.exists(dependency_conf_file, function (exists) {
    if(!exists) return
    if(that.analyzed.indexOf(dependency) >= 0) return
    that.read_conf(dependency_conf_file, function (e, conf) {
      if(e) return log.onError(e)
      if(that.analyzed.indexOf(dependency) >= 0) return
      if(utils.defined(conf.main)) that.add_main(conf.main, dependency)
    })
  })
}

bower.prototype.analize_conf = function (conf) {
  if(conf.dependencies) Object.keys(conf.dependencies).forEach(this.read_dependency_conf, this)
}

// TESTAR:
// com bower.json e com bower_components (onde bower_components tem mais dependencias que bower)
// sem bower.json e com bower_components
// com bower.json e sem bower_components
// todos com e sem defs já gravadas

// TODO: limpar código
// TODO: ignorar ~.js files


var lizard = module.exports = function (workspace) {
  if(!(this instanceof lizard)) return new lizard(workspace)
  this.workspace = workspace
  this.defined = workspace.config.defined
  this.bower = bower(this)
  //workspace.tern.on('afterLoad', this.analize_file.bind(this))
  //fs.watch(workspace.dir, this.check_dotfiles.bind(this))
}

lizard.prototype.analize_file = function (file) {
  if(this.defined) return
  //file.name, lineOffsets, ast, text, scope
}

lizard.prototype.check_dotfiles = function () {
  if(this.defined) return
}

// monitor root file creations
// monitor file changes for:
//  * package.json
//  * component.json
//  * bower.json
//  *
//
// component
// bower
// npm
// ender
// volo
// jam
// grunt
// browserify