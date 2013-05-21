var interpolate = require('util').format,
    formidable = require('formidable'),
    domain = require('domain'),
    utils = require('./utils'),
    log = require('./log')

module.exports = function () {
  var routes = {
    post: {}
  }
  
  var process = function (req, res) {
    return function () {
      var form = new formidable.IncomingForm()
      var method = req.method.toLowerCase()
      form.encoding = 'utf-8'
      
      if(routes[method][req.url]) form.parse(req, function(e, fields, files) {
        if(e) return log.onError(e)
        req.body = fields
        routes[method][req.url](req, res)
      })
    }
  }
      
  var middleware = function (req, res) {
    domain.create().on('error', utils.http.respond.domain(res)).run(process(req, res))
  }
  
  middleware.post = function (route, callback) {
    routes.post[route] = callback
  }
  
  return middleware
}