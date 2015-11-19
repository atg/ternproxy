var glob = require('glob')
var fs = require('fs')
var wf = require('waterfall')
var async = require('async')
var fs = require('fs')
var path = require('path')

var root = path.join(__dirname, '..')

var onFile = function(file, fn){
  wf().push(function(fn){
    fs.readFile(file, 'utf8', fn)
  }).push(function(json, fn){
    var pkg = JSON.parse(json)
    ['_id', '_shasum', '_resolved', '_from', 'readme', 'readmeFilename'].forEach(function(key){
      pkg[key] = undefined
    })
    fn(null, JSON.stringify(pkg, null, 2))
  }).push(function(json, fn){
    fs.writeFile(path.join(root, file), json, fn)
  }).callback(fn)
}

glob('**/package.json', function(err, files){
  if (err) throw err
  async.forEach(files, onFile, function(err){
    if (err) throw err
    console.log('done')
  })
})