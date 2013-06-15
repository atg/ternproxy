var interpolate = require('util').format,
    workspace = require('./workspace'),
    utils = require('./utils')

var proxy = module.exports = {
  workspaces: {}
}

proxy.workspace = function (project_id, project_dir) {
  if(!proxy.workspaces.hasOwnProperty(project_id)) {
    proxy.workspaces[project_id] = new workspace(project_dir, project_id, proxy.timeout(project_id))
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

proxy.compact = function (workspace) {
  return Object.keys(workspace.cache).filter(function (id) {
    return !!workspace.cache[id]
  })
}

proxy.file = function (info) {
  if(!info.FILE) return []

  var workspace = proxy.workspace(info.project_id, info.project_dir)
  var full = !!JSON.parse(info.sending_full_content)
  var offset = Number(info.delta_offset)
  var length = Number(info.delta_length)
  var document_id = info.document_id
  var name = proxy.filename(info)
  var text = info.FILE

  if(!full) text = proxy.delta(workspace, document_id, offset, length, text)
  else workspace.cache[document_id] = text

  return [{type: 'full', name: name, text: text, offset: offset }]
}

proxy.delta = function (workspace, document_id, offset, length, content) {
  if(!workspace.cache[document_id]) return ''
  
  var oldContent = workspace.cache[document_id]
  var prefix = oldContent.substr(0, offset)
  var suffix = oldContent.substr(offset + length, oldContent.length - offset - length)

  workspace.cache[document_id] = content = prefix + content + suffix
  
  return content
}