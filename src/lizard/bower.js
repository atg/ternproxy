var condense = require('../condense')(null, true),
    interpolate = require('util').format,
    utils = require('../utils'),
    semver = require('semver'),
    mkdirp = require('mkdirp'),
    async = require('async'),
    log = require('../log'),
    path = require('path'),
    fs = require('fs')

// when deciding if there are already defs generated, the version should be taken into account
//  semver.satisfies(version_we_have, version_needed)

var default_defs_dir = path.join(__dirname, '../../node_modules/tern/defs')
var defs_dir = path.join(process.env.HOME, 'Library/Caches/com.chocolatapp.chocolat/defs')
var def_file = path.join(defs_dir, '%s@%s.json')

mkdirp.sync(defs_dir)

var default_libs = fs.readdirSync(default_defs_dir).map(function (def) {
  return def.replace(/.json$/, '')
})

var libs = {}

fs.readdirSync(defs_dir).map(function (def) {
  return def.replace(/.json$/, '')
}).forEach(function (filename) {
  filename = filename.split('@')
  
  var version = filename[1]
  var name = filename[0]
  
  if(!utils.defined(libs[name])) libs[name] = {
    versions: []
  }
  
  libs[name].versions.push(version)
})

// Bower constructor
var bower = module.exports = function (lizard) {
  if(!(this instanceof bower)) return new bower(lizard)
  
  this.lizard = lizard
  this.identified = []
  
  this.bowerrc(this.updated.bind(this))
}

// Reads .bowerrc and defines the components folder (this.components)
bower.prototype.bowerrc = function (callback) {
  var that = this
  
  var bowerrc = path.join(that.lizard.workspace.dir, '.bowerrc')
  utils.JSON.read(bowerrc, function (e, conf) {
    if(e) log.onError(e)
    if(!utils.defined(conf)) conf = {}
    if(typeof conf !== 'object') conf = {}
    if(!utils.defined(conf.directory)) conf.directory = 'bower_components'
    
    that.components = path.join(that.lizard.workspace.dir, conf.directory)
    callback()
  })
}

// Triggered when this.compoents or bower.json is changed
// if no arg is provided, it refreshes both the folder and bower.json
bower.prototype.updated = function (what) {
  if(what) return this.updated[what].call(this)
  
  this.updated['bower.json'].call(this)
  setTimeout(this.updated.bower_components.bind(this), 300)
}

// Triggered when bower.json is changed
// reads bower.json and calls for dependencies refresh
bower.prototype.updated['bower.json'] = function () {
  var that = this
  
  var bower_json = path.join(that.lizard.workspace.dir, 'bower.json')
  utils.JSON.read(bower_json, function (e, conf) {
    if(!utils.defined(conf)) return
    if(e) return log.onError(e)
    if(!utils.defined(conf.dependencies)) return
    if(Array.isArray(conf.dependencies)) return
    if(typeof conf.dependencies !== 'object') return
    
    Object.keys(conf.dependencies).forEach(function (dependency) {
      that.identify(dependency, conf.dependencies[dependency])
    })
  })
}

// Triggered when this.componentns is changed
// reads the names of the folders inside of it and calls for dependencies refresh
bower.prototype.updated.bower_components = function () {
  var that = this
  
  fs.exists(that.components, function (exists) {
    if(!exists) return
    fs.readdir(that.components, function (e, dependencies) {
      if(e) return log.onError(e)
      dependencies.forEach(function (dependency) {
        that.identify(dependency)
      })
    })
  })
}

// identifies a dependency
bower.prototype.identify = function (dependency, req_version) {
  var that = this

  if(that.identified.indexOf(dependency) >= 0) return
  that.identified.push(dependency)
  
  if(default_libs.indexOf(dependency) >= 0)
    return that.push(dependency, true)

  var bower_json = path.join(that.components, dependency, 'bower.json')
  utils.JSON.read(bower_json, function (e, conf) {
    if(!utils.defined(conf)) return
    if(e) return log.onError(e)
    if(!utils.defined(conf.main)) return
    if(!Array.isArray(conf.main)) return
    if(!req_version) req_version = '*'
    
    var compatible_version = false
    var version = false
    
    var lib = libs[dependency] = libs[dependency] || {
      versions: []
    }
    
    version = lib.versions.filter(function (version) {
      return semver.satisfies(version, req_version)
    }).sort(function (v1, v2) {
      return semver.compare(v1, v2)
    })
    
    compatible_version = !!version.length
    
    if(version.length) version = version.shift()
    if(!compatible_version) version = conf.version
    
    var file = interpolate(def_file, dependency, version)
    
    if(compatible_version) return that.push(file)
    
    bower.sources(conf.main.map(function (file) {
      return path.resolve(that.components, dependency, file)
    }), function (e, source) {
      if(e) return log.onError(e)
      bower.condense(source, file, dependency, function (e) {
        if(e) return log.onError(e)
        libs[dependency].versions.push(version)
        that.push(file)
      })
    })
  })
}

bower.prototype.push = function (lib, is_default) {
  if(this.lizard.workspace.config.libs.indexOf(lib) >= 0) return
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

bower.condense = function (source, file, name, callback) {
  condense(name, source, null, function (e, condense) {
    if(e) return callback(e)
    if(!utils.defined(condense)) return callback(new Error('empty condense'))
    if(typeof condense !== 'object') return callback(new Error('wrong condense'))
    fs.writeFile(file, JSON.stringify(condense, null, 2), 'utf8', callback)
  })
}


// TESTAR:
// com bower.json e com bower_components (onde bower_components tem mais dependencias que bower)
// sem bower.json e com bower_components
// com bower.json e sem bower_components
// todos com e sem defs já gravadas