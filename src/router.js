var interpolate = require('util').format,
    formidable = require('formidable'),
    domain = require('domain'),
    utils = require('./utils')

module.exports = function () {
  var routes = {
    post: {},
    get: {}
  }
  
  var timeout = function (req, res) {
    return function () {
      if(res.finished) return 0
      res.statusCode = 408
      res.end()
    }
  }

  var process = function (req, res) {
    setTimeout(timeout(req, res), 500)
    
    return function () {
      var form = new formidable.IncomingForm()
      var method = req.method.toLowerCase()
      form.encoding = 'utf-8'

      if(!routes[method][req.url]) return utils.http.respond(req, res)(null, null, 404)

      form.parse(req, function(e, fields, files) {
        if(e) throw e
        
        if(fields.cursor_position) fields.cursor_position = Number(fields.cursor_position)
        if(fields.delta_length) fields.delta_length = Number(fields.delta_length)
        if(fields.delta_offset) fields.delta_offset = Number(fields.delta_offset)
        if(fields.sending_full_content) fields.sending_full_content = JSON.parse(fields.sending_full_content)
        
        req.body = fields
        
        routes[method][req.url](req, res)
      })
    }
  }

  var middleware = function (req, res) {
    domain.create().on('error', utils.http.respond(req, res)).run(process(req, res))
  }
  
  ;['post', 'get'].forEach(function (method) {
    middleware[method] = function (route, callback) {
      routes[method][route] = callback
    }
  })

  return middleware
}