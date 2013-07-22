var interpolate = require('util').format,
    present = require('./config.json'),
    findpkg = require('findpkg'),
    merge = require('deepmerge'),
    tryor = require('tryor'),
    path = require('path'),
    log = require('./log'),
    noop = function () {},
    fs = require('fs')

var utils = module.exports
utils.completions = noop
utils.find = noop
utils.load = noop
utils.get = noop
utils.http = noop
utils.noop = noop

var parse_cfg = function (str) {
  var cfg = JSON.parse(str)
  cfg.defined = true
  return cfg
}

var get_cfg = function (file) {
  if(fs.existsSync(file)) return parse_cfg(fs.readFileSync(file, 'utf8'))
}

var def_cfg = get_cfg(path.join(process.env.HOME, '.tern-project'))

utils.get.config = function (dir) {
  var file = path.join(dir, '.tern-project')
  if(!fs.existsSync(file) && def_cfg) return def_cfg

  return merge(tryor(function() {
    return get_cfg(file) || {}
  }, {}), present)
}

utils.get.file = function (name, callback) {
  fs.readFile(name, 'utf8', callback)
}

utils.load.plugins = function (plugins) {
  var base = path.resolve(utils.find.module('tern').dirname, 'plugin')

  Object.keys(plugins).forEach(function (plugin) {
    var file = path.join(base, interpolate('%s.js', plugin))
    if(fs.existsSync(file)) return require(file)
  })
}

utils.find.module = function (name) {
  return findpkg({filename: require.resolve(name)})
}

utils.find.defs = function (dir, libs) {
  var base = path.resolve(utils.find.module('tern').dirname, 'defs')

  return libs.map(function (lib) {
    if(!/\.json$/.test(lib)) lib = lib + '.json';
    var file = path.join(base, lib)
    if(fs.existsSync(file)) return require(file)
  }).filter(function (lib) {
    return !!lib
  })
}

utils.http.respond = function (req, res) {
  return function (e, data, status) {
    if(e) log.onError(e)
    if(res.finished) return
    
    if(!e && typeof status !== 'number') status = 200
    if(e && typeof status !== 'number') status = 500

    var isObj = (typeof data === 'object')
    if(isObj) res.setHeader('content-type', 'application/json')

    res.statusCode = status
    res.end(isObj ? JSON.stringify(data) : data)
    log.res(req, res, data)
  }
}

utils.completions.order = function (callback) {
  return function (e, data) {
    if(e) return callback(e, data)
    data.completions = data.completions.sort(function (a, b) { return a.depth - b.depth })
    callback(e, data)
  }
}

utils.defined = function () {
  return Array.prototype.every.call(arguments, function (el) {
    return (typeof el !== 'undefined') && (el !== null)
  })
}

utils.values = function(object) {
  return Object.keys(object).map(function (key) {
    return object[key]
  })
}