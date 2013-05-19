var interpolate = require('util').format,
    compact = require('lodash').compact,
    present = require('./config.json'),
    findpkg = require('findpkg'),
    merge = require('deepmerge'),
    tryor = require('tryor'),
    path = require('path'),
    log = require('./log'),
    noop = function () {},
    fs = require('fs')

var utils = module.exports
utils.find = noop
utils.load = noop
utils.get = noop
utils.http = noop


utils.get.config = function (dir) {
  var config = tryor(function() {
      return fs.readFileSync(path.join(dir, '.tern-project'), 'utf8')
  }, present)
  
  return merge(config, present)
}

utils.get.file = function (dir) {
  return function (name, callback) {
    fs.readFile(path.resolve(dir, name), 'utf8', callback)
  }
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
  
  return compact(libs.map(function (lib) {
    if(!/\.json$/.test(lib)) lib = lib + '.json';
    var file = path.join(base, lib)
    if(fs.existsSync(file)) return require(file)
  }))
}

utils.http.request = function (res) {
  return function (e, data) {
    if(!e) return utils.http.respond(res, 200, data)
    log.onError(e)
    utils.http.respond(res, 500, e)
  }
}

utils.http.respond = function (res, status, body) {
  var isObj = (typeof body === 'object')
  if(isObj) res.setHeader('content-type', 'application/json')
  res.statusCode = status
  res.end(isObj ? JSON.stringify(body) : body)
}