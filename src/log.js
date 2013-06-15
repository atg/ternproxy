var interpolate = require('util').format,
    
    verbose = require('optimist').argv.v

module.exports = function (message) {
  console.log('Chocolat ⇄ Tern: ', message);
}

module.exports.onError = function (e, res) {
  module.exports(interpolate('[ERROR] %s\nArguments: %s\nType: %s\nStack: %s\n', e.message, e.arguments, e.type, e.stack))
}

module.exports.req = function (req) {
  if(!verbose) return
  var log = ''
  
  log += '\n+------------------------------------------+'
  log += interpolate('\n| => %s%s|\n', req.url, toSpaces(req.url.length + 4))
  log += '+------------------------------------------+'
  
  Object.keys(req.body).forEach(function (key) {
    if(key === 'FILE') return
    var space = toSpaces(key.length + req.body[key].length + 3)
    log += interpolate('\n| %s: %s%s|', key, req.body[key], space)
  })
  
  log += '\n+------------------------------------------+'
  
  if(!req.body.FILE || req.url === '/file/opened' || JSON.parse(req.body.sending_full_content)) return console.log(log)
  
  req.body.FILE.split('\n').forEach(function (line) {
    log += interpolate('\n| %s', line)
  })
  
  log += '\n+------------------------------------------+\n'
  console.log(log)
}

module.exports.res = function (req, res, data) {
  if(!verbose) return
  var log = ''
  
  log += '\n+------------------------------------------+'
  log += interpolate('\n| <= %s%s|\n', req.url, toSpaces(req.url.length + 4))
  log += '+------------------------------------------+'
  
  if(module.exports.res[req.url]) log = module.exports.res[req.url](data, log)
  else return console.log(log)

  log += '\n+------------------------------------------+\n'
  console.log(log)
}

module.exports.res['/file/complete'] = function (body, log) {
  return log.concat(body.completions.map(function (completion) {
    return interpolate('\n| (%s) %s = %s (%s)', completion.depth, completion.name, completion.type, completion.origin)
  }).join())
}

function toSpaces (length) {
  if(length > 42) return ''
  return new Array((42 - length) + 1).join(' ')
}

process.on('uncaughtException', module.exports.onError)