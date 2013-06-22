var interpolate = require('util').format,
    workspace = require('./workspace'),
    utils = require('./utils'),
    path = require('path')
    
    
    
var proxy = module.exports = {
  workspaces: {}
}

proxy.workspace = function (project_id, project_dir) {
  if(proxy.workspaces[project_id]) proxy.workspaces[project_id].extend()
  else proxy.workspaces[project_id] = new workspace(project_dir, project_id, proxy.timeout(project_id))

  return proxy.workspaces[project_id]
}

proxy.workspace.find = function (info) {
  var project_ids = Object.keys(proxy.workspaces).filter(function (project_id) {
    return info.path.lastIndexOf(proxy.workspaces[project_id].dir, 0) === 0
  }).sort(function(pid1, pid2) {
    var p1 = proxy.workspaces[pid1].dir
    var p2 = proxy.workspaces[pid2].dir
    
    return p2.length - p1.length;
  })
  
  if(project_ids.length) return proxy.workspaces[project_ids.pop()]
  
  var project_dir = path.dirname(info.path)
  var project_id = info.project_id
  
  return proxy.workspaces[project_id] = new workspace(project_dir, project_id, proxy.timeout(project_id), 300000)
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

  return [{type: 'full', name: name, text: text}]
}

proxy.delta = function (workspace, document_id, offset, length, content) {
  if(!workspace.cache[document_id]) return ''
  
  var oldContent = workspace.cache[document_id]
  var prefix = oldContent.substr(0, offset)
  var suffix = oldContent.substr(offset + length, oldContent.length - offset - length)

  workspace.cache[document_id] = content = prefix + content + suffix
  
  return content
}