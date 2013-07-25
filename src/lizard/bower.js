var condense = require('../condense')(null, true),
    interpolate = require('util').format,
    utils = require('../utils'),
    log = require('../log'),
    path = require('path'),
    fs = require('fs')

// have a special folder for generated defs
//  /Users/ramitos/Library/Caches/com.chocolatapp.chocolat
// the files shoub be saved in with the current version: ember@1.0.0.json
// when deciding if there are already defs generated, the version should be taken into account
//  semver.satisfies(version_we_have, version_needed)


var def_file = path.join(__dirname, '../../node_modules/tern/defs', '%s.json')
var defs_dir = path.join(__dirname, '../../node_modules/tern/defs')
var libs = fs.readdirSync(defs_dir).map(function (def) {
  return def.replace(/.json$/, '')
})


var bower = module.exports = function (lizard) {
  if(!(this instanceof bower)) return new bower(lizard)
  
  this.components = path.join(lizard.workspace.dir, 'bower_components')
  this.lizard = lizard
  this.identified = []
  
  this.updated()
}

bower.prototype.updated = function (what) {
  if(what) return this.updated[what].call(this)
  
  this.updated.bower_components.call(this)
  this.updated['bower.json'].call(this)
}

bower.prototype.updated['bower.json'] = function () {
  var that = this
  
  var bower_json = path.join(that.lizard.workspace.dir, 'bower.json')
  utils.JSON.read(bower_json, function (e, conf) {
    if(!utils.defined(conf)) return
    if(e) return log.onError(e)
    if(!utils.defined(conf.dependencies)) return
    if(Array.isArray(conf.dependencies)) return
    if(typeof conf.dependencies !== 'object') return
    
    that.dependencies(null, Object.keys(conf.dependencies))
  })
}

bower.prototype.updated.bower_components = function () {
  var that = this
  
  fs.exists(that.components, function (exists) {
    if(!exists) return
    fs.readdir(that.components, that.dependencies.bind(that))
  })
}

bower.prototype.dependencies = function (e, dependencies) {
  if(e) return log.onError(e)
  dependencies.forEach(this.identify, this)
}

bower.prototype.identify = function (dependency) {
  var that = this

  if(that.identified.indexOf(dependency) >= 0) return
  that.identified.push(dependency)
  if(libs.indexOf(dependency) >= 0) return that.push(dependency)

  var bower_json = path.join(that.components, dependency, 'bower.json')
  utils.JSON.read(bower_json, function (e, conf) {
    if(!utils.defined(conf)) return
    if(e) return log.onError(e)
    if(!utils.defined(conf.main)) return
    if(!Array.isArray(conf.main)) return

    bower.sources(conf.main.map(function (file) {
      return path.resolve(that.components, dependency, file)
    }), function (e, source) {
      if(e) return log.onError(e)
      bower.condense(source, dependency, function (e) {
        if(e) return log.onError(e)
        that.push(dependency)
      })
    })
  })
}

bower.prototype.push = function (lib) {
  this.lizard.workspace.config.libs.push(lib)
  this.lizard.workspace.start(this.lizard.workspace.config)
}

bower.sources = function (files, callback) {
  async.map(files, function (file, callback) {
    if(path.extname(file) !== '.js') return callback(null, '')
    fs.readFile(file, 'utf8', callback)
  }, function (e, results) {
    callback(e, e ? '' : results.join(';;'))
  })
}

bower.condense = function (source, dependency, callback) {
  condense(dependency, source, null, function (e, condense) {
    if(e) return log.onError(e)
    if(!utils.defined(condense)) return
    if(typeof condense !== 'object') return
    
    var data = JSON.stringify(condense, null, 2)
    var file = interpolate(def_file, dependency)
    
    fs.writeFile(file, data, 'utf8', callback)
  })
}


// TESTAR:
// com bower.json e com bower_components (onde bower_components tem mais dependencias que bower)
// sem bower.json e com bower_components
// com bower.json e sem bower_components
// todos com e sem defs já gravadas