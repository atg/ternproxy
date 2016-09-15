var http = require('http');
var posix = require('posix');

var symbols = require('./symbols');
var utils = require('../utils');
var proxy = require('./proxy');
var condense = require('../condense')();
var router = require('../router')();
var log = require('../log');

var server = http.createServer(router).listen(8542, '127.0.0.1', function() {
  log('HTTP server running');
});

// every 3s check if the parent is still running
setInterval(function() {
  if (server.connections) {
    return;
  }

  if (posix.getppid() < 2) {
    process.exit();
  }
}, 3000);

router.post('/file/opened', function(req, res) {
  var workspace = proxy.workspace(req.body);

  workspace.file(req.body.document_id, req.body.FILE, proxy.filename(req.body));
  utils.http.respond(req, res)(null, 'Document opened');
});

router.post('/file/closed', function(req, res) {
  Object.keys(proxy.workspaces).map(function(project_id) {
    return proxy.workspaces[project_id];
  }).filter(function(workspace) {
    return workspace && !!workspace.cache[req.body.document_id];
  }).forEach(function(workspace) {
    clearTimeout(workspace.cache[req.body.document_id].timeout);
    workspace.clean(req.body.document_id)();

    if (!proxy.compact(workspace)) {
      proxy.timeout(workspace.id)();
    }
  });

  utils.http.respond(req, res)(null, 'Document closed');
});

/**
 * Asks the server for a set of completions at the given point.
 *
 * @param {string} file Relative path of the file
 * @param {number} end Cursor position
 * @param {boolean} [types=false] include the types of the completions in the result
 * @param {boolean} [depths=false] include the distance (in scopes for variables,
 *   in prototypes for properties) between the completions and the origin
 *   position in the result data.
 * @param {boolean} [docs=false] include documentation strings in the result
 * @param {boolean} [urls=false] include urls in the result
 * @param {boolean} [origin=false] include origin in the result
 * @param {boolean} [filter=true] When on, only completions that match the current
 *    word at the given point will be returned. Turn this off to get all results,
 *    so that you can filter on the client side
 * @param {boolean} [guess=true] When completing a property and no completions are
 *    found, Tern will use some heuristics to try and return some properties anyway.
 * @param {boolean} [sort=true] Determines whether the result set will be sorted
 * @param {boolean} [expandWordForward=true] When disabled, only the text before
 *    the given position is considered part of the word. When enabled (the default),
 *    the whole variable name that the cursor is on will be included.
 * @param {boolean} [omitObjectPrototype=true] Whether to ignore the properties of
 *    Object.prototype unless they have been spelled out by at least to characters.
 *
 * @returns {object}
 *   {number} start
 *   {number} end
 *   {array} completions
 *     {string} name
 *     {string} type
 *     {} depth
 *     {} doc
 *     {string} url
 *     {} origin
 */
router.post('/file/complete', function(req, res) {
  var workspace = proxy.workspace(req.body);

  if (!workspace) {
    return utils.http.respond(req, res)(null, undefined, 304);
  }

  workspace.tern.request({
    files: proxy.file(req.body, workspace),
    query: {
      type: 'completions',
      file: '#0',
      types: true,
      depths: true,
      docs: true,
      urls: true,
      sort: false,
      omitObjectPrototype: false,
      guess: true,
      filter: true,
      origins: true,
      end: req.body.cursor_position
    }
  }, utils.completions.order(utils.completions.transform(utils.http.respond(req, res))));

  if (!utils.defined(req.body.heuristics)) {
    return;
  }

  setImmediate(function() {
    workspace.heuristics(req.body.heuristics);
  });
});

/**
 * Asks for the definition of something. This will try, for a variable or property,
 * to return the point at which it was defined. If that fails, or the chosen
 * expression is not an identifier or property reference, it will try to return
 * the definition site of the type the expression has. If no type is found, or the
 * type is not an object or function(other types don’t store their definition site),
 * it will fail to return useful information
 *
 * @param {number} [start]
 * @param {number} end Cursor position
 * @param {string} file Relative path of the file
 *
 * @returns {object}
 *   {number} start The start positions of the definition
 *   {number} end The end positions of the definition
 *   {string} file The file in which the definition was defined
 *   {boolean} guess Indicates whether finding the definition required any heuristic guesses
 *   {string} context A slice of the code in front of the definition
 *   {number} contextOffset the offset from the start of the context to the actual definition
 *   {string} docs
 *   {string} urls
 *   {string} origin
 */
router.post('/definition', function(req, res) {
  var workspace = proxy.workspace(req.body);

  if (!workspace) {
    return utils.http.respond(req, res)(null, undefined, 304);
  }

  workspace.tern.request({
    files: proxy.file(req.body, workspace),
    query: {
      type: 'definition',
      end: req.body.cursor_position,
      file: '#0'
    }
  }, utils.http.respond(req, res));
});

/**
 * Query the type of something.
 *
 * @param {number} [start]
 * @param {number} end Cursor position
 * @param {string} file Relative path of the file
 * @param {boolean} [preferFunction=false] Set to true when you are interested
 *   in a function type. This will cause function types to win when something has
 *   multiple types.
 * @params {number} [depth=0] Determines how deep the type string must be expanded
 *   Nested objects will only display property types up to this depth, and be
 *   represented by their type name or a representation showing only property
 *   names below it.
 *
 * @returns {object}
 *   {string} type A description of the type of the value. May be "?" when no type was found
 *   {boolean} guess Whether the given type was guessed, or should be considered reliable
 *   {string} name The name associated with the type
 *   {string} exprName When the inspected expression was an identifier or a
 *     property access, this will hold the name of the variable or property
 *   {string} docs
 *   {string} urls
 *   {string} origin
 */
router.post('/type', function(req, res) {
  var workspace = proxy.workspace(req.body);

  if (!workspace) {
    return utils.http.respond(req, res)(null, undefined, 304);
  }

  workspace.tern.request({
    files: proxy.file(req.body, workspace),
    query: {
      type: 'type',
      end: req.body.cursor_position,
      file: '#0'
    }
  }, utils.http.respond(req, res));
});

/**
 * Get the documentation string and URL for a given expression, if any
 *
 * @param {number} [start]
 * @param {number} end Cursor position
 * @param {string} file Relative path of the file
 *
 * @returns {object}
 *   {string} docs
 *   {string} urls
 *   {string} origin
 */
router.post('/documentation', function(req, res) {
  var workspace = proxy.workspace(req.body);

  if (!workspace) {
    return utils.http.respond(req, res)(null, undefined, 304);
  }

  workspace.tern.request({
    files: proxy.file(req.body, workspace),
    query: {
      type: 'documentation',
      end: req.body.cursor_position,
      file: '#0'
    }
  }, utils.http.respond(req, res));
});

/**
 * Used to find all references to a given variable or property
 *
 * @param {number} [start]
 * @param {number} end Cursor position
 * @param {string} file Relative path of the file
 *
 * @returns {object}
 *   {string} name
 *   {array} refs
 *     {string} file
 *     {number} start
 *     {number} end
 */
router.post('/refs', function(req, res) {
  var workspace = proxy.workspace(req.body);

  if (!workspace) {
    return utils.http.respond(req, res)(null, undefined, 304);
  }

  workspace.tern.request({
    files: proxy.file(req.body, workspace),
    query: {
      type: 'refs',
      end: req.body.cursor_position,
      file: '#0'
    }
  }, utils.http.respond(req, res));
});

/**
 * Rename a variable in a scope-aware way
 *
 * @param {number} [start]
 * @param {number} end Cursor position
 * @param {string} file Relative path of the file
 * @param {string} newName Name to give
 *
 * @returns {object}
 *   {array} changes
 *     {string} file
 *     {number} start
 *     {number} end
 *     {string} text
 */
router.post('/rename', function(req, res) {
  var workspace = proxy.workspace(req.body);

  if (!workspace) {
    return utils.http.respond(req, res)(null, undefined, 304);
  }

  workspace.tern.request({
    files: proxy.file(req.body, workspace),
    query: {
      type: 'rename',
      end: req.body.cursor_position,
      newName: req.body.new_name,
      file: '#0'
    }
  }, utils.http.respond(req, res));
});

router.post('/tags', function(req, res) {
  var workspace = proxy.workspace(req.body);
  var content = proxy.file(req.body, workspace).pop().text;
  var file = req.body.path;

  var callback = function(err, condense) {
    if (err) {
      return utils.http.respond(req, res)(err);
    }

    symbols({
      condense: condense,
      content: content,
      file: file
    }, utils.http.respond(req, res));
  };

  if (workspace) {
    workspace.condense(file, content, callback);
  } else {
    condense(file, content, req.body.project_dir, callback);
  }
});

router.get('/ping', function(req, res) {
  utils.http.respond(req, res)(null, {
    memory: process.memoryUsage(),
    uptime: process.uptime(),
    pid: process.pid,
    version: process.version,
    cwd: process.cwd()
  });
});
