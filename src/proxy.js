var interpolate = require('util').format,
    workspace = require('./workspace'),
    cache = require('./cache')

var proxy = module.exports = {
  workspaces: {}
}

proxy.workspace = function (project_id, project_dir) {
  if(!proxy.workspaces.hasOwnProperty(project_id)) {
    proxy.workspaces[project_id] = new workspace(project_dir, project_id, timeout(project_id))
  } else proxy.workspaces[project_id].extend()

  return proxy.workspaces[project_id]
}

proxy.timeout = function (id) {
  return function () {
    proxy.workspaces[id] = undefined
  }
}

proxy.filename = function (info) {
  // If this is untitled, use ///null/<documentid>
  if(info.path === '///null') return interpolate('///null/%s', info.document_id)
  return info.path
}

proxy.untitled = function (path) {
  return path === '///null'
}

proxy.file = function (info) {
  if(!info.FILE) return undefined
  
  var name = proxy.filename(info)
  var text = info.FILE
  
  var offset = info.sending_full_content ? undefined : delta_offset
  var type = info.sending_full_content ? 'full' : 'part'
  var delta_offset = Number(info.delta_offset)
  var delta_length = Number(info.delta_length)
  var document_id = info.document_id
  
  if(proxy.untitled(info.path))
    text = proxy.delta(document_id, delta_offset, delta_length, text)

  return {type: type, name: name, text: text, offset: offset }
}

proxy.delta = function (document_id, offset, length, content) {
  var oldContent = cache[document_id]
  var prefix = oldContent.substr(0, offset)
  var suffix = oldContent.substr(offset + length, oldContent.length - offset - length)
  
  cache[document_id] = content = prefix + content + suffix
  return content
}