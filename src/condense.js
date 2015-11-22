var condense = require('tern/lib/condense')
var tern = require('tern')

var utils = require('./utils')

module.exports = function(proto, comments) {
  return function(file, content, dir, callback) {
    var config = {
      getFile: utils.get.file,
      async: true,
      plugins: {
        doc_comment: Boolean(comments),
        'local-scope': true
      }
    }

    var server = (function(that) {
      if (!utils.defined(proto)) {
        return new tern.Server(config)
      }

      if (!(that instanceof proto)) {
        return new tern.Server(config)
      }

      if (!utils.defined(that.config.plugins.node)) {
        return that.tern
      }

      config = JSON.parse(JSON.stringify(that.config))
      config.plugins.node = undefined
      return new tern.Server(JSON.parse(JSON.stringify(config)))
    })(this)

    server.request({
      files: [{
        name: file,
        text: content,
        type: 'full'
      }]
    }, utils.noop)

    server.flush(function(err) {
      if (err) {
        return callback(err)
      }

      callback(null, condense.condense(file, file, {
        spans: true
      }))

      server.reset()
    })
  }
}
