var request = require('request'),
    path = require('path'),
    fs = require('fs')

request.post('http://0.0.0.0:5678/workspace/0', {
  json: {
    directory: path.join(__dirname, 'wrkspc')
  }
}, function (e) {
  if(e) throw e
  
  request.post('http://0.0.0.0:5678/file/0', {
    json: {file: 'a.js'}
  }, function (e) {
    if(e) throw e
    
    request.post('http://0.0.0.0:5678/file/0', {
      json: {file: 'b/c.js'}
    }, function (e) {
      if(e) throw e
      
      
      request.get('http://0.0.0.0:5678/completion/0/8/part', {
        json: {
          file: {
            name: 'b/c.js',
            offset: 0,
            text: fs.readFileSync(path.join(__dirname, 'wrkspc', 'b/c.js'), 'utf8')
          }
        }
      }, function (e, body) {
        if(e) throw e
        console.log(body);
      })
    })
  })
})