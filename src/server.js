var bodyParser = require('connect').bodyParser(),
    router = require('turnout')(),
    blage = require('blage'),
    clone = require('clone'),
    tern = require('tern'),
    http = require('http'),
    path = require('path')


var socket = path.join(process.env.HOME, 'Library/Application Support/Chocolat/tern.sock')
var requestTmplt = require('./request')
var getFile = require('./getFile')
var terns = Object()


http.createServer(blage(bodyParser, router)).listen(socket)


router.post('/workspace/:id', function (req, res, params, query) {
  terns[params.id] = new tern.Server(getFile(req.body.directory), require('./environment'))
  terns[params.id].directory = req.body.directory
  res.end()
})

router.post('/file/:workspace', function (req, res, params, query) {
  terns[params.workspace].addFile(req.body.file)
  getFile.force(terns[params.workspace], req.body.file, function () {
    res.end()
  })
})

router.del('/file/:workspace', function (req, res, params, query) {
  terns[params.workspace].delFile(req.body.file)
  res.end()
})

router.get('/type', function (req, res, params, query) {})

router.get('/completion/:workspace/:end/:type', function (req, res, params, query) {
  var request = clone(requestTmplt)

  request.query.file = (params.type == 'full' ? req.body.file.name : '#0')
  request.query.type = 'completions'
  request.query.end = params.end
  
  request.files[0].type = params.type
  request.files[0].name = req.body.file.name
  request.files[0].text = req.body.file.text
  if(params.type == 'part') request.files[0].offset = req.body.file.offset
  
  terns[params.workspace].request(request, function (e, data) {
    res.write(JSON.stringify(data.completions))
  })
})