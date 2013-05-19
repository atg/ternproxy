var router = require('./router')(),
    proxy = require('./proxy'),
    cache = require('./cache'),
    utils = require('./utils'),
    log = require('./log'),
    http = require('http')


http.createServer(router).listen(8542, function () {
  log('HTTP server running')
})


router.post('/file/opened', function (req, res) {
  if(proxy.untitled(req.body.path)) {
    cache[req.body.document_id] = req.body.TEXT
    utils.http.respond(res, 200, 'Document opened')
  } else utils.http.respond(res, 304)
})

router.post('/file/closed', function (req, res) {
  if(cache[req.body.document_id]) {
    cache[req.body.document_id] = undefined
    utils.http.respond(res, 200, 'Document closed')
  } else utils.http.respond(res, 304)
})

/*
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
     word at the given point will be returned. Turn this off to get all results,
     so that you can filter on the client side
 * @param {boolean} [guess=true] When completing a property and no completions are
     found, Tern will use some heuristics to try and return some properties anyway.
 * @param {boolean} [sort=true] Determines whether the result set will be sorted
 * @param {boolean} [expandWordForward=true] When disabled, only the text before
     the given position is considered part of the word. When enabled (the default),
     the whole variable name that the cursor is on will be included.
 * @param {boolean} [omitObjectPrototype=true] Whether to ignore the properties of
     Object.prototype unless they have been spelled out by at least to characters.
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
router.post('/completions', function (req, res) {
  proxy.workspace(req.body.project_id, req.body.project_dir).tern.request({
    query: {
      type: 'completions',
      types: true,
      depths: true,
      docs: true,
      urls: true,
      origins: true,
      omitObjectPrototype: false,
      file: proxy.filename(req.body),
      end: Number(req.body.cursor_position)
    }, files: [proxy.file(req.body)]
  }, utils.http.request(res))
})

/*
 * Asks for the definition of something. This will try, for a variable or property,
 * to return the point at which it was defined. If that fails, or the chosen
 * expression is not an identifier or property reference, it will try to return
 * the definition site of the type the expression has. If no type is found, or the
 * type is not an object or function (other types don’t store their definition site),
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
router.post('/definition', function (req, res) {
  proxy.workspace(req.body.project_id, req.body.project_dir).tern.request({
    query: {
      type: 'definition',
      file: proxy.filename(req.body),
      end: Number(req.body.cursor_position)
    }, files: [proxy.file(req.body)]
  }, utils.http.request(res))
})

/*
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
router.post('/type', function (req, res) {
  proxy.workspace(req.body.project_id, req.body.project_dir).tern.request({
    query: {
      type: 'type',
      file: proxy.filename(req.body),
      end: Number(req.body.cursor_position)
    }, files: [proxy.file(req.body)]
  }, utils.http.request(res))
})

/*
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
router.post('/documentation', function (req, res) {
  proxy.workspace(req.body.project_id, req.body.project_dir).tern.request({
    query: {
      type: 'documentation',
      file: proxy.filename(req.body),
      end: Number(req.body.cursor_position)
    }, files: [proxy.file(req.body)]
  }, utils.http.request(res))
})

/*
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
router.post('/refs', function (req, res) {
  proxy.workspace(req.body.project_id, req.body.project_dir).tern.request({
    query: {
      type: 'refs',
      file: proxy.filename(req.body),
      end: Number(req.body.cursor_position)
    }, files: [proxy.file(req.body)]
  }, utils.http.request(res))
})

/*
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
router.post('/rename', function (req, res) {
  proxy.workspace(req.body.project_id, req.body.project_dir).tern.request({
    query: {
      type: 'documentation',
      file: proxy.filename(req.body),
      end: Number(req.body.cursor_position)
      newName: req.body.new_name
    }, files: [proxy.file(req.body)]
  }, utils.http.request(res))
})

/*
 * Get a list of all known object property names (for any object)
 *
 * @param {string} [prefix] Causes the server to only return properties that start
 *   with the given string
 * @param {boolean} [sort=true] Whether the result should be sorted.
 *
 * @returns {object}
 *   {array} completions
 */
router.post('/properties', function (req, res) {
  proxy.workspace(req.body.project_id, req.body.project_dir).tern.request({
    query: {
      type: 'properties',
      prefix: req.body.prefix,
    }, files: [proxy.file(req.body)]
  }, utils.http.request(res))
})

/*
 * Get the files that the server currently holds in its set of analyzed files
 *
 * @returns {object}
 *   {array} files
 */
router.post('/files', function (req, res) {
  proxy.workspace(req.body.project_id, req.body.project_dir).tern.request({
    query: {
      type: 'files'
    }, files: [proxy.file(req.body)]
  }, utils.http.request(res))
})