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
  var clean = function(token) {
    return token.replace(/\:\:$/, '')
  }

  var filter = function(tokens) {
    if (!Array.isArray(tokens)) {
      return tokens;
    }

    var first = tokens.shift();
    var last = tokens.pop();

    return [first].concat(tokens.filter(function(token) {
      return token !== 'prototype';
    })).concat([last]);
  }

  var split = function() {
    return !tag.namespace ? [] : (tag.namespace || '').split(/\./)
  }

  var join = function(tokens) {
    return tokens.join('::')
  }

  var qualified_name = function() {
    return clean(join(filter(split().concat(tag.name))))
  }

  var type_code = function() {
    return tag.kind === 'v' ? 'variable' : 'function'
  }

  var parent_name = function() {
    return clean(join(filter(split())))
  };

  var r = range(tag['origin']['!span'])

  return filter({
    name: tag.name,
    qualified_name: qualified_name(),
    type_code: type_code(),
    parent_name: parent_name(),
    range_line: r.line,
    range_column: r.column,
    range_length: r.length,
    line_content: lines[r.line]
  })
}

var map = function(lines, tags) {
  return tags.map(transform.bind(this, lines))
}

var proto = function(symbol) {
  var i = symbol.qualified_name.split(/\:\:/).indexOf('prototype');

  if (symbol.name !== 'prototype') {
    return true;
  }


  if (i < 0) {
    return true;
  }

  if (i !== 1) {
    return true;
  }

  return false;
}

var hasTags = function(lines, fn) {
  return function(err, tags) {
    fn(err, {
      tags: map(lines, tags || []).filter(proto)
    })
  }
}

module.exports = function(condense, content, fn) {
  var lines = content.split(/\n/)

  jsctags({
    condense: condense,
    content: content
  }, hasTags(lines, fn))
}
