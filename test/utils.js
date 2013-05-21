var interpolate = require('util').format,
    ternproxy = require('../src/daemon'),
    request = require('request')

beforeEach(function (callback) {
  if(!ternproxy.listening) ternproxy.on('listening', callback)
  else callback()
})

module.exports.query = function (url, body, callback) {
  request.post(interpolate('http://0.0.0.0:8542%s', url), {
    form: body
  }, function (e, res, body) {
    if(e) return callback(e)
        
    if(res.headers['content-type'] === 'application/json') body = JSON.parse(body)
    else if(res.statusCode === 500) return callback(new Error(body))

    if(res.statusCode === 500) return callback(body)
    callback(e, body)
  })
}