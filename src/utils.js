var noop = function() {};
var merge = require('deepmerge');
var tryor = require('tryor');
var some = require('lodash.some');
var uniq = require('lodash.uniq');
var format = require('util').format;
var Module = require('module');
var path = require('path');
var fs = require('fs');

var log = require('./log');
var present = require('./config.json');
var expand = require('./expand');
var doc = require('./doc');

var utils = module.exports;
utils.completions = noop;
utils.find = noop;
utils.load = noop;
utils.get = noop;
utils.http = noop;
utils.JSON = noop;
utils.noop = noop;

var parse_cfg = function(str) {
  var cfg = JSON.parse(str);
  cfg.defined = true;
  return cfg;
};

var get_cfg = function(file) {
  if (fs.existsSync(file)) {
    return parse_cfg(fs.readFileSync(file, 'utf8'));
  }
};

utils.get.config = function(dir) {
  var file = path.join(dir, '.tern-project');

  return merge(tryor(function() {
    return get_cfg(file) || {};
  }, {}), present);
};

utils.get.file = function(name, callback) {
  fs.readFile(name, 'utf8', callback);
};

utils.load.plugins = function(plugins) {
  var base = path.resolve(utils.find.module('tern'), 'plugin');
  var local = path.resolve(__dirname, '../node_modules/jsctags/src/local-scope');

  var attempt = function(name) {
    if (name === 'local-scope') {
      require(local);
      return true;
    }

    var file = Module._findPath(name, module.paths);

    if (!fs.existsSync(file)) {
      return false;
    }

    require(file);
    return true;
  };

  Object.keys(plugins).forEach(function(plugin) {
    some([
      path.join(base, format('%s.js', plugin)),
      format('tern-%s', plugin),
      plugin
    ], attempt);
  });
};

utils.find.module = function(name) {
  return path.join(__dirname, '../node_modules/', name);
};

utils.find.defs = function(libs) {
  var base = path.resolve(utils.find.module('tern'), 'defs');

  return uniq(libs.map(function(lib) {
    if (/^ecma5|^ecma6/) {
      lib = 'ecmascript';
    }

    if (!/\.json$/.test(lib)) {
      lib = lib + '.json';
    }

    if (!/^\//.test(lib)) {
      lib = path.join(base, lib);
    }

    if (fs.existsSync(lib)) {
      return lib;
    }
  }).filter(function(lib) {
    return utils.defined(lib);
  })).map(function(lib) {
    try {
      return require(lib);
    } catch (err) {
      return;
    }
  }).filter(function(lib) {
    return utils.defined(lib);
  });
};

utils.http.respond = function(req, res) {
  return function(err, data, status) {
    if (err) {
      log.onError(err);
    }

    if (res.finished) {
      return;
    }

    if (!err && typeof status !== 'number') {
      status = 200;
    }

    if (err && typeof status !== 'number') {
      status = 500;
    }

    var isObj = (typeof data === 'object');

    if (isObj) {
      res.setHeader('content-type', 'application/json');
    }

    res.statusCode = status;
    res.end(isObj ? JSON.stringify(data) : data);
  };
};

utils.completions.order = function(callback) {
  return function(err, data) {
    if (err) {
      return callback(err, data);
    }

    data.completions = data.completions.sort(function(a, b) {
      return a.depth - b.depth;
    });

    callback(err, data);
  };
};

utils.completions.transform = function(callback) {
  return function(err, data) {
    if (err) {
      return callback(err, data);
    }

    data.completions = data.completions.map(function(completion) {
      try {
        completion.snippet = expand(completion.type);
        completion.html = doc(completion.doc);
      } catch (err) {
        log.onError(err);
      }

      return completion;
    });

    callback(null, data);
  };
};

utils.defined = function() {
  return Array.prototype.every.call(arguments, function(el) {
    return (typeof el !== 'undefined') && (el !== null);
  });
};

utils.values = function(object) {
  return Object.keys(object).map(function(key) {
    return object[key];
  });
};

utils.JSON.parse = function(data, callback) {
  try {
    var json = JSON.parse(data);
    callback(null, json);
  } catch (err) {
    callback(err);
  }
};

utils.JSON.read = function(file, callback) {
  fs.exists(file, function(exists) {
    if (!exists) {
      return callback();
    }

    fs.readFile(file, 'utf8', function(err, data) {
      if (err) {
        return callback(err);
      }

      try {
        var json = JSON.parse(data);
        callback(null, json);
      } catch (err) {
        callback(err);
      }
    });
  });
};
