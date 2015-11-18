var glob = require('glob')
var intoStream = require('into-stream')
var through = require('through2')
var path = require('path')
var fs = require('fs')


glob('**/*/package.json', function(err, files) {
  if (err) {
    throw err
  }

  var onFile = through.obj(function(chunk, enc, fn) {
    var filename = path.join(process.cwd(), chunk.toString())
    var pkg = require(filename)

    Object.keys(pkg).forEach(function(key) {
      if (!(/^\_|^readme|^readmeFilename/).test(key)) {
        return
      }

      pkg[key] = undefined
    })

    fs.writeFile(filename, JSON.stringify(pkg, null, 2), 'utf-8', fn)
  })

  intoStream(files).pipe(onFile).pipe(process.stdout)
})