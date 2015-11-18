var jsctags = require('jsctags')

var range = function(span) {
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

var transform = function(lines, tag) {
  var split = function() {
    return !tag.namespace ? [] : (tag.namespace || '').split(/\./)
  }

  var join = function(tokens) {
    return tokens.join('::')
  }

  var qualified_name = function() {
    return join(split().concat(tag.name))
  }

  var type_code = function() {
    return tag.kind === 'v' ? 'variable' : 'function'
  }

  var parent_name = function() {
    return join(split())
  };

  var r = range(tag['origin']['!span'])

  return {
    name: tag.name,
    qualified_name: qualified_name(),
    type_code: type_code(),
    parent_name: parent_name(),
    range_line: r.line,
    range_column: r.column,
    range_length: r.length,
    line_content: lines[r.line]
  }
}

module.exports = function(condense, content, fn) {
  var lines = content.split(/\n/)

  jsctags({
    condense: condense,
    content: content
  }, function(err, tags) {
    fn(err, (tags || []).map(transform.bind(this, lines)))
  })
}
