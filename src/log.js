var interpolate = require('util').format

module.exports = function(message) {
  console.log('Chocolat ⇄ Tern: ', message)
}

module.exports.onError = function(e, res) {
  module.exports(interpolate('%s\nArguments: %s\nType: %s\nStack: %s\n', e.message, e.arguments, e.type, e.stack))
}

process.removeListener('uncaughtException', module.exports.onError)
process.on('uncaughtException', module.exports.onError)
