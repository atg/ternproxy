var path = require('path'),
    fs = require('fs')

module.exports = function (context) {
  return {getFile: function(name, callback) {
    fs.readFile(path.join(context, name), 'utf8', callback)
  }}
}

module.exports.force = function (tern, file, callback) {
  fs.readFile(path.join(tern.directory, file), 'utf8', function (e, data) {
    tern.request({
      query: {
        type: 'completions',
        end: 0,
        file: file
      },
      file: [
        {
          type: 'full',
          name: file,
          text: data
        }
      ]
    }, callback)
  })
}