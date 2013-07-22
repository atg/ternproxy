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

bower.prototype.assert_concurrency = function (name) {
  if(this.analyzed.indexOf(name) >= 0) return true
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
  console.log(name)
  this.analyzed.push(name)
  this.lizard.workspace.config.libs.push(name)
  this.lizard.workspace.start(this.lizard.workspace.config)
}

bower.prototype.read_dependencies_dir = function (dir) {
  var that = this
}

bower.prototype.read_dependency_conf = function (name) {
  var that = this
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
  if(this.assert_concurrency(name)) return
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

bower.prototype.analize_conf = function (conf) {
  var that = this
  
  if(conf.dependencies) Object.keys(conf.dependencies).forEach(function (dependency) {
    if(tern_libs.indexOf(dependency) >= 0) return that.add_known_lib(dependency)
    if(that.assert_concurrency(dependency)) return
    
    var dependency_conf_file = path.join(that.dependencies_dir, dependency, 'bower.json')
    fs.exists(dependency_conf_file, function (exists) {
      if(!exists) return
      if(that.assert_concurrency(dependency)) return
      
      that.read_conf(dependency_conf_file, function (e, conf) {
        if(e) return log.onError(e)
        if(that.assert_concurrency(dependency)) return
        if(utils.defined(conf.main)) that.add_main(conf.main, dependency)
      })
    })
  })
}

bower.prototype.analize_dependencies_dir = function (dirs) {
  
}



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

/*

var bower_components = []
// read the libs





var bower = JSON.parse(fs.readFileSync(path.join(workspace.dir, 'bower.json'), 'utf8'))
//TODO: cuidado com ficheiros non-js (tipo coffescript)

  //ver se as dependencias estão registadas
    //se estiverem registadas, ver se estão instaladas
      //se estiverem isntaladas, correr condense nos main files
      //se não estiverem isntaladas, procurar no typescript
      
//se não estiverem registadas, correr a pasta
var dependencies_dir = path.join(workspace.dir, 'bower_components')
var dependencies = fs.readdirSync(dependencies_dir)

dependencies.forEach(function (dependency) {
  if((tern_libs.indexOf(dependency) >= 0) && (workspace.config.libs.indexOf(dependency) < 0)) {
    workspace.config.libs.push(dependency)
    return workspace.start(workspace.config)
  }
  
  var declaration_file = path.join(dependencies_dir, dependency, 'bower.json')
  //ver se o ficheiro existe
  if(!fs.existsSync(declaration_file)) return
  var declaration = JSON.parse(fs.readFileSync(declaration_file, 'utf8'))
  //
  if(!utils.defined(declaration) || !utils.defined(declaration.main)) return
  var script_files = declaration.main.map(function (file) {
    return path.resolve(dependencies_dir, dependency, file)
  })
  //se o ficheiro não existir, procurar declaração typescript
  script_files.forEach(function (file) {
    if(!fs.existsSync(file)) return
    if(bower_components.indexOf(dependency) >= 0) return
    condense(file, fs.readFileSync(file, 'utf8'), path.dirname(file), function (e, condense) {
      if(e) console.log('CONDENSE ERROR', e)
      fs.writeFileSync(path.join(__dirname, '../node_modules/tern/defs', dependency + '.json'), JSON.stringify(condense, null, 2), 'utf8')
      workspace.config.libs.push(dependency)
      workspace.start(workspace.config)
      bower_components.push(dependency)
      // condense['!name'] = dependency
      // workspace.defs.push(condense)
      // workspace.start(workspace.config, true)
      // bower_components.push(dependency)
      // console.log('added %s', file)
    })
  })
})*/


// {
//   "name": "ember",
//   "version": "1.0.0-rc.6",
//   "main": [
//     "./ember.js"
//   ],
//   "dependencies": {
//     "jquery": "~1.9.1",
//     "handlebars": "1.0.0-rc.4"
//   },
//   "gitHead": "884a040a6bfe02d125be6f55fb2030f8f6644d16",
//   "readme": "Ember.js\n========\n\nShim repository for [Ember Application Framework](http://emberjs.com/).\n\nThis package provides the core of the ember.js framework.\n\nPackage Managers\n----------------\n\n* [Bower](http://bower.io): `ember`\n* [Composer](http://packagist.org/packages/components/ember): `components/ember`\n",
//   "readmeFilename": "README.md",
//   "_id": "ember@1.0.0-rc.6",
//   "description": "Ember.js ========",
//   "repository": {
//     "type": "git",
//     "url": "git://github.com/components/ember"
//   }
// }


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

