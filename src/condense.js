var condense = require('tern/lib/condense'),
    utils = require('./utils'),
    tern = require('tern')

module.exports = function (proto, comments) {
  return function (file, content, dir, callback) {
    var config = (function () {
      if(!utils.defined(proto) || !(this instanceof proto))
        return {getFile: utils.get.file, async: true, plugins: {doc_comment: !!comments}}
  
      var plugins = JSON.parse(JSON.stringify(this.config.plugins))
      plugins.node = undefined
      plugins = JSON.parse(JSON.stringify(plugins))
  
      return {
        getFile: utils.get.file,
        async: true,
        defs: this.defs,
        plugins: this.config.plugins,
        projectDir: this.dir
      }
    })(this)
  
    var server = new tern.Server(config)
  
    server.request({files: [{
      name: file,
      text: content,
      type: 'full'
    }]}, utils.noop)
  
    server.flush(function (e) {
      if(e) return callback(e)
      callback(null, condense.condense(file, file, {spans: true}))
      server.reset()
    })
  }
}