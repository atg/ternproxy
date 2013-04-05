var tern = require('tern');
var formidable = require('formidable');
var http = require('http');
var debug = require('debug')('choc:tern_server');

// var socket = path.join(process.env.HOME, 'Library/Application Support/Chocolat/tern.sock');
//var requestTmplt = require('./request');
//var getFile = require('./getFile');
//var terns = {};

// http.createServer(blage(bodyParser, router)).listen(8542, function() {
  // console.log("listening");
// });
/*
http.createServer(function(req, res) {
  
  console.log("request");
  res.writeHead(200, {'Content-Type': 'text/plain'});
  res.end('Hello World\n');
  
}).listen(8542, function() {
  console.log("listening");
});
*/
console.log("Ready.");

var Proxy = {};
Proxy.projects = {};

function environment() {
    return [
        require('../node_modules/tern/defs/ecma5.json'),
        require('../node_modules/tern/defs/browser.json'),
        require('../node_modules/tern/defs/jquery.json'),
    ];
}

function processDelta(info) {
    if (info.sending_full_content === 'false') {
        var proj = Proxy.getOrCreateProject(info);
        var oldContent = proj.files[info.document_id]['content'];

        var offset = Number(info['delta_offset']);
        var length = Number(info['delta_length']);

        var prefix = oldContent.substr(0, offset);
        var inner = info['FILE'];
        var suffix = oldContent.substr(offset + length, oldContent.length - offset - length);

        var newContent = prefix + inner + suffix;
        proj.files[info.document_id]['content'] = newContent;
        return newContent;
    }
    return info['FILE'];
}

Proxy.newProject = function(project_id, dir) {
    return Proxy.projects[project_id] = {
        "tern": new tern.Server({ 'environment': environment() }),
        "directory": dir,
        "files": {},
    };
}

Proxy.filename = function(info) {
    // If this is untitled, use ///null/<documentid>
    if (info.path === '///null')
        return '///null/' + info.document_id;
    return info.path;
}

Proxy.getOrCreateProject = function(info) {
    var p = info.project_id;
    if (!Proxy.projects.hasOwnProperty(p))
        Proxy.projects[p] = Proxy.newProject(info.project_id, info.project_dir);
    
    return Proxy.projects[p];
};

Proxy.ternRequest = function(proj, file, loc, callback) {
    proj.tern.request({
      query: {
        type: 'completions',
        types: true,
        end: Number(loc),
        file: file.name,
      },
      files: [
        {
          type: 'full',
          name: file.name,
          text: file.content,
        }
      ]
    }, callback);
}

Proxy.fileOpened = function(info, callback) {
    var proj = Proxy.getOrCreateProject(info);
    var file = {
        'name': Proxy.filename(info),
        'content': info.FILE,
    };
    console.log(proj);
    console.log(info);
    proj.files[info.document_id] = file;
    proj.tern.addFile(file.name, file.content);
    
    Proxy.ternRequest(proj, file, 0, function() {
        callback({});
    });
};

Proxy.fileClosed = function(info, callback) {
    var proj = Proxy.getOrCreateProject(info);
    proj.tern.delFile(Proxy.filename(info));
    callback({});
};

Proxy.fileCompletions = function(info, callback) {
    var proj = Proxy.getOrCreateProject(info);
    var file = {
        'name': Proxy.filename(info),
        'content': processDelta(info),
    };
    console.log("<delta>");
    console.log(info);
    console.log("</delta>");
    
    console.log("<altered>");
    console.log(file);
    console.log("</altered>");
    
    var loc = info.cursor_position;
    
    Proxy.ternRequest(proj, file, loc, function(e, data) {
        console.log("<result>");
        console.log(e);
        console.log("  - - -");
        console.log(data);
        console.log("</result>");
        // var output = {
            // "output": data.completions,
        // };
        
        callback(data);
    });
}

/**
 * Configuration.
 */

var port = /*process.NODE_ENV.PORT ||*/ 8542;

/**
 * Server implementation.
 */

http.createServer(function(req, res) {
    var form = new formidable.IncomingForm();
    form.encoding = 'utf-8';
    
    var url = req.url;
    var method = req.method.toLowerCase();
    
    debug('%s url: %s', method, url);
    console.log("-- REQUEST --");

    if (url == '/file/opened' && method == 'post') {
        form.parse(req, function(err, fields, files) {
            
            Proxy.fileOpened(fields, function(data) {
                res.writeHead(200, {'content-type': 'application/json'});
                res.end(JSON.stringify(data));
            });
        });
    }
    else if (url == '/file/closed' && method == 'post') {
        form.parse(req, function(err, fields, files) {
            
            Proxy.fileClosed(fields, function(data) {
                res.writeHead(200, {'content-type': 'application/json'});
                res.end(JSON.stringify(data));
            });
        });
    }
    else if (url == '/file/complete' && method == 'post') {
        form.parse(req, function(err, fields, files) {
            console.log("<fields>");
            console.log(fields);
            console.log("</fields>");

            Proxy.fileCompletions(fields, function(data) {
                res.writeHead(200, {'content-type': 'application/json'});
                console.log("-- OUTPUT --");
                console.log("<output>");
                console.log(JSON.stringify(data));
                console.log("</output>");
                
                console.log("end");
                res.end(JSON.stringify(data));
                console.log("/end");
            });
        });
    }
    else {
        debug('invalid request');
        res.writeHead(400, 'Bad Request');
        res.end();
    }
}).listen(port);


  /*
router.post('/file/complete/:id', function (req, res, params, query) {
  console.log("Complete");
  
  var request = clone(requestTmplt);

  request.query.file = (params.type == 'full' ? req.body.file.name : '#0');
  request.query.type = 'completions';
  request.query.end = params.end;
  
  request.files[0].type = params.type;
  request.files[0].name = req.body.file.name;
  request.files[0].text = req.body.file.text;
  if(params.type == 'part') request.files[0].offset = req.body.file.offset;
  
  terns[params.workspace].request(request, function (e, data) {
    res.end(JSON.stringify(data.completions));
  })
});
*/
