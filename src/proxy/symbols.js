var jsctags = require('jsctags');
var mapValues = require('lodash.mapvalues');
var sortBy = require('lodash.sortby');
var groupBy = require('lodash.groupby');
var map = require('lodash.map');

var CLASS = /^class\s*?\w+(\s+extends\s+\w+\s*?|\s*?)\{$/;
var PROTOTYPE = /\.prototype$/;

var Parser = function(lines, tags) {
  if (!(this instanceof Parser)) {
    return new Parser(tags);
  }

  this.lines = lines;
  this.tags = tags;
  this.symbols = [];

  this.byId = {
    symbols: {},
    tags: {}
  };

  this.iterate();
  this.clean();
};

Parser.prototype.clean = function() {
  this.symbols = this.symbols.filter(this.filterByProto, this);

  var byLine = groupBy(this.symbols, 'range_line');

  var singleLines = mapValues(byLine, function(symbols) {
    return sortBy(symbols, function(symbol) {
      return symbol.range_column;
    }).shift();
  });

  this.symbols = map(singleLines, function(v, k) {
    return v;
  }).filter(function(symbol) {
    var tag = this.byId.tags[symbol.id];
    var parent = this.byId.tags[symbol.parent];

    if ((/^\</).test(tag.name)) {
      return false;
    }

    return (
      tag.type ||
      (parent && parent.origin['!data'].isPlainObject) ||
      tag.origin['!data'].type
    );
  }, this);
};

Parser.prototype.iterate = function() {
  this.tags.forEach(this.transform, this);
};

Parser.prototype.transform = function(tag) {
  this.byId.tags[tag.id] = tag;

  var r = this.range(tag.origin['!span']);

  var clean = function(token) {
    return token.replace(/\:\:$/, '');
  };

  var filter = function(tokens) {
    if (!Array.isArray(tokens)) {
      return tokens;
    }

    var first = tokens.shift();
    var last = tokens.pop();

    return [first].concat(tokens.filter(function(token) {
      return token !== 'prototype';
    })).concat([last]);
  };

  var split = function() {
    return !tag.namespace ? [] : (tag.namespace || '').split(/\./);
  };

  var join = function(tokens) {
    return tokens.join('::');
  };

  var qualified_name = function() {
    return clean(join(filter(split().concat(tag.name))));
  };

  var parent_name = function() {
    return clean(join(filter(split())));
  };

  var symbol = filter({
    name: tag.name,
    qualified_name: qualified_name(),
    type_code: this.type_code(r, tag),
    parent_name: parent_name(),
    range_line: r.line,
    range_column: r.column,
    range_length: r.length,
    line_content: this.lines[r.line],
    parent: tag.parent,
    id: tag.id
  });

  this.byId.symbols[tag.id] = symbol;
  this.symbols.push(symbol);
};

Parser.prototype.type_code = function(r, tag) {
  if (!tag) {
    return;
  }

  if (CLASS.test(this.lines[r.line])) {
    return 'class';
  }

  if (tag.origin['!data'].isConstructor) {
    return 'class';
  }

  var parent = this.byId.tags[tag.parent];

  var isClassVariable = ((
    parent &&
    parent.origin['!data'].isConstructor &&
    !tag.origin['!data'].scopped
  ) || (
    this.type_code(r, parent) === 'class_variable' &&
    !tag.origin['!data'].scopped
  ));

  if (isClassVariable) {
    return 'class_variable';
  }

  if (tag.origin['!data'].isPlainObject) {
    return 'variable';
  }

  if (PROTOTYPE.test(tag.namespace)) {
    return tag.kind === 'f' ? 'class_method' : 'class_variable';
  }

  return tag.kind === 'v' ? 'variable' : 'function';
};

Parser.prototype.filterByProto = function(symbol) {
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
};

Parser.prototype.range = function(span) {
  span = span.match(/^(\d*?)\[(\d*?)\:(\d*?)\]-(\d*?)\[\d*?\:\d*?\]$/);

  var lend = Number(span.pop());
  var column = Number(span.pop());
  var line = Number(span.pop());
  var lstart = Number(span.pop());

  return {
    line: line,
    column: column,
    length: lend - lstart
  };
};

module.exports = function(ctx, fn) {
  var hasTags = function(err, tags) {
    if (err) {
      return fn(err);
    }

    var lines = ctx.content.split(/\n/);
    var symbols = new Parser(lines, tags).symbols;
    // console.log(symbols);

    fn(err, {
      tags: symbols
    });
  };

  jsctags({
    file: ctx.file,
    condense: ctx.condense,
    content: ctx.content,
    preserveType: true
  }, hasTags);
};
