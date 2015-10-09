var interpolate = require('util').format
var workspace = require('./workspace')
var utils = require('../utils')
var path = require('path')


var proxy = module.exports = {
  workspaces: {}
}


var get_workspace = function(project_dir, project_id, exists) {
  if (exists) {
    proxy.workspaces[project_id].extend()
    return proxy.workspaces[project_id]
  }

  var timeout = proxy.timeout(project_id)
  proxy.workspaces[project_id] = workspace(project_dir, project_id, timeout)
  return proxy.workspaces[project_id]
}


proxy.workspace = function(info) {
  var project_dir = info.project_dir
  var project_id = info.project_id
  var file = info.path

  if (utils.defined(project_id, proxy.workspaces[project_id]))
    return get_workspace(project_dir, project_id, true)


  if (utils.defined(project_id, project_dir))
    return get_workspace(project_dir, project_id)

  if (utils.defined(project_id, file))
    return get_workspace(path.dirname(info.path), project_id)

  var project_ids = Object.keys(proxy.workspaces).filter(function(project_id) {
    var workspace = proxy.workspaces[project_id]

    if (!utils.defined(workspace)) return
    return workspace.dir === project_dir
  })

  if (project_ids.length)
    return get_workspace(project_dir, project_ids.shift(), true)
}


proxy.timeout = function(id) {
  return function() {
    if (utils.defined(proxy.workspaces[id]) && utils.defined(proxy.workspaces[id].tern))
      proxy.workspaces[id].tern.reset()
    if (utils.defined(proxy.workspaces[id]))
      proxy.workspaces[id] = undefined
  }
}


proxy.filename = function(info) {
  // If this is untitled, use ///null/<documentid>
  if (info.path === '///null') return interpolate('///null/%s', info.document_id)
  return info.path
}


proxy.untitled = function(path) {
  return path === '///null'
}


proxy.compact = function(workspace) {
  return Object.keys(workspace.cache).filter(function(id) {
    return !!workspace.cache[id]
  })
}


proxy.file = function(info, workspace) {
  var full = !!info.sending_full_content
  var offset = info.delta_offset
  var length = info.delta_length
  var document_id = info.document_id
  var name = proxy.filename(info)
  var text = info.FILE || ''

  if (!full && utils.defined(workspace))
    text = proxy.delta(workspace, document_id, offset, length, text)

  if (text.length < info.cursor_position)
    info.cursor_position = text.length

  if (full && utils.defined(workspace))
    workspace.file(document_id, text, name)

  return [{type: 'full', name: name, text: text}]
}


proxy.delta = function(workspace, document_id, offset, length, content) {
  var oldContent = workspace.file(document_id)
  if (!oldContent) return ''

  var prefix = oldContent.substr(0, offset)
  var suffix = oldContent.substr(offset + length, oldContent.length - offset - length)

  content = prefix + content + suffix
  workspace.file(document_id, content)

  return content
}