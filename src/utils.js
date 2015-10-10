var noop = function() {}
var merge = require('deepmerge')
var tryor = require('tryor')
var interpolate = require('util').format
var path = require('path')
var fs = require('fs')

var log = require('./log')
var present = require('./config.json')
var expand = require('./expand')
var doc = require('./doc')

var utils = module.exports
utils.completions = noop
utils.find = noop
utils.load = noop
utils.get = noop
utils.http = noop
utils.JSON = noop
utils.noop = noop

var parse_cfg = function(str) {
  var cfg = JSON.parse(str)
  cfg.defined = true
  return cfg
}

var get_cfg = function(file) {
  if (fs.existsSync(file)) {
    return parse_cfg(fs.readFileSync(file, 'utf8'))
  }
}

var def_cfg = get_cfg(path.join(process.env.HOME, '.tern-project'))

utils.get.config = function(dir) {
  var file = path.join(dir, '.tern-project')

  if (!fs.existsSync(file) && def_cfg) {
    return def_cfg
  }

  return merge(tryor(function() {
    return get_cfg(file) || {}
  }, {}), present)
}

utils.get.file = function(name, callback) {
  fs.readFile(name, 'utf8', callback)
}

utils.load.plugins = function(plugins) {
  var base = path.resolve(utils.find.module('tern'), 'plugin')

  Object.keys(plugins).forEach(function(plugin) {
    var file = path.join(base, interpolate('%s.js', plugin))

    if (fs.existsSync(file)) {
      return require(file)
    }
  })
}

utils.find.module = function(name) {
  return path.join(__dirname, '../node_modules/', name)
}

utils.find.defs = function(libs) {
  var base = path.resolve(utils.find.module('tern'), 'defs')

  return libs.map(function(lib) {
    if (!/\.json$/.test(lib)) {
      lib = lib + '.json'
    }

    if (!/^\//.test(lib)) {
      lib = path.join(base, lib)
    }

    if (fs.existsSync(lib)) {
      return require(lib)
    }
  }).filter(function(lib) {
    return utils.defined(lib)
  })
}

utils.http.respond = function(req, res) {
  return function(err, data, status) {
    if (err) {
      log.onError(err)
    }

    if (res.finished) {
      return
    }

    if (!err && typeof status !== 'number') {
      status = 200
    }

    if (err && typeof status !== 'number') {
      status = 500
    }

    var isObj = (typeof data === 'object')

    if (isObj) {
      res.setHeader('content-type', 'application/json')
    }

    res.statusCode = status
    res.end(isObj ? JSON.stringify(data) : data)
  }
}

utils.completions.order = function(callback) {
  return function(err, data) {
    if (err) {
      return callback(err, data)
    }

    data.completions = data.completions.sort(function(a, b) {
      return a.depth - b.depth
    })

    callback(err, data)
  }
}

utils.completions.transform = function(callback) {
  return function(err, data) {
    if (err) {
      return callback(err, data)
    }

    data.completions = data.completions.map(function(completion) {
      try {
        completion.snippet = expand(completion.type)
        completion.html = doc(completion.doc)
      } catch (err) {
        log.onError(err)
      }

      return completion
    })

    callback(null, data)
  }
}

utils.defined = function() {
  return Array.prototype.every.call(arguments, function(el) {
    return (typeof el !== 'undefined') && (el !== null)
  })
}

utils.values = function(object) {
  return Object.keys(object).map(function(key) {
    return object[key]
  })
}

utils.JSON.parse = function(data, callback) {
  try {
    var json = JSON.parse(data)
    callback(null, json)
  } catch (err) {
    callback(err)
  }
}

utils.JSON.read = function(file, callback) {
  fs.exists(file, function(exists) {
    if (!exists) {
      return callback()
    }

    fs.readFile(file, 'utf8', function(err, data) {
      if (err) {
        return callback(err)
      }

      try {
        var json = JSON.parse(data)
        callback(null, json)
      } catch (err) {
        callback(err)
      }
    })
  })
}
