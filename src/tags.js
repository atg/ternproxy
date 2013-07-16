module.exports = function (condense, content) {
  var types = {}
  var tags = []
  
  Object.keys(condense).forEach(function (name) {
    tagger(content.split('\n'), condense[name], tags, [], name)
  })
  
  return tags.sort(function (tag1, tag2) {
    return tag1.range_line - tag2.range_line
  })
}

var range = function (span) {
  span = span.match(/^(\d*?)\[(\d*?)\:(\d*?)\]-(\d*?)\[\d*?\:\d*?\]$/)
  
  var lend = Number(span.pop())
  var column = Number(span.pop())
  var line = Number(span.pop())
  var lstart = Number(span.pop())
  
  return {
    line: line,
    column: column,
    length: lend - lstart
  }
}

var type_code = function (type) {
  if(type.match(/^fn/)) return 'function'
  else return 'variable'
}

var tagger = function (lines, condense, tags, parent, name) {
  if(typeof condense !== 'object' || name.match(/^\!/)) return 0
  var type = condense['!type']
  var span = condense['!span']
  var p = parent.slice()
  p.push(name)
  
  Object.keys(condense).forEach(function (key) {
    if(key.match(/^\!/)) return 0
    tagger(lines, condense[key], tags, p, key)
  })
  
  if(!span || !type) return 0
  
  var r = range(span)
  
  return tags.push({
    name: name,
    qualified_name: p.join('::'),
    type_code: type_code(type),
    parent_name: parent.join('::'),
    range_line: r.line,
    range_column: r.column,
    range_length: r.length,
    line_content: lines[r.line]
  })
}