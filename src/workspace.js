var utils = require('./utils'),
    path = require('path'),
    tern = require('tern'),
    fs = require('fs')


module.exports = function (dir, id, callback, timeout) {
  var self = this
  
  self.id = id
  self.cache = {}
  self.dir = path.resolve(dir)
  self.config = utils.get.config(self.dir)
  self.defs = utils.find.defs(self.dir, self.config.libs)
  utils.get.plugins(self.config.plugins)
  self.timeout = setTimeout(callback, timeout | 1800000) //30m
  self.callback = callback
  
  self.tern = new tern.Server({
    getFile: utils.get.file,
    async: true,
    defs: self.defs,
    plugins: self.config.plugins,
    projectDir: self.dir
  })
  
  if(self.config.loadEagerly) config.loadEagerly.forEach(function (file) {
    self.tern.addFile(file)
  })
}

module.exports.prototype.extend = function () {
  clearTimeout(this.timeout)
  this.timeout = setTimeout(this.callback, 1800000) //30m
}