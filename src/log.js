module.exports = function (message) {
  console.log('Chocolat ⇄ Tern: ', message);
}

module.exports.onError = function () {
  module.exports(interpolate('[ERROR] %s\nArguments: %s\nType: %s\nStack: %s\n', e.message, e.arguments, e.type, e.stack))
}