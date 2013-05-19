var interpolate = require('util').format,
    log = require('./log')

module.exports = function () {
  var routes = {
    post: {}
  }
  
  var middleware = function (req, res) {
    var form = new formidable.IncomingForm()
    var method = req.method.toLowerCase()
    form.encoding = 'utf-8'
    
    Object.keys(routes).forEach(function (route) {
      if(routes[method][route]) form.parse(req, function(e, fields, files) {
        if(e) return log.onError(e)
        req.body = fields
        routes[method][route](req, res)
      })
    })
  }
  
  middleware.post = function (route, callback) {
    routes.post[route] = callback
  }
  
  return middleware
}