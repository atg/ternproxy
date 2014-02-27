var bower = require('./bower')

var lizard = module.exports = function (workspace) {
  if(!(this instanceof lizard)) return new lizard(workspace)
  this.workspace = workspace
  this.defined = workspace.config.defined
  this.bower = bower(this)
  //workspace.tern.on('afterLoad', this.analize_file.bind(this))
  //fs.watch(workspace.dir, this.check_dotfiles.bind(this))
}

lizard.prototype.is_bower = function () {

}

lizard.prototype.analize_file = function (file) {
  if(this.defined) return
  //file.name, lineOffsets, ast, text, scope
}

lizard.prototype.check_dotfiles = function () {
  if(this.defined) return
}

// monitor root file creations
// monitor file changes for:
//  * package.json
//  * component.json
//  * bower.json
//  *
//
// component
// bower
// npm
// ender
// volo
// jam
// grunt
// browserify