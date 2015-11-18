var format = require('util').format
var hljs = require('highlight.js')
var Remarkable = require('remarkable')
var path = require('path')

var css = format('file://%s', path.join(__dirname, 'doc.css'));
var md = new Remarkable({
  breaks: true,
  linkify: true,
  highlight: function(code, lang) {
    try {
      if (lang) {
        return hljs.highlight(lang, code).value;
      }

      return hljs.highlight('javascript', code).value;
    } catch (e) {
      console.log('Highlight ERROR', e)
      return code
    }
  }
});

var addTagsTable = function(tags) {
  var returns = '<hr>'
  var types = {}

  Object.keys(tags).sort(function(tag1, tag2) {
    return tags[tag1].type.localeCompare(tags[tag2].type);
  }).filter(function(tag) {
    return tags[tag].type.search(/^return$|^param$|^throws$/) >= 0;
  }).forEach(function(tag) {
    tag = tags[tag];

    if (!tag.type) {
      return;
    }

    if (!types[tag.type]) {
      types[tag.type] = [];
    }

    types[tag.type].push(tag);
  })

  Object.keys(types).forEach(function(type) {
    returns += format('<p class=\'tag\'><strong>%ss</strong></p><table><tbody>', type);
    var tags = types[type];

    returns += format('%s</tbody></table>', tags.map(function(tag) {
      if (tag.types && Array.isArray(tag.types)) tag.types = tag.types.map(function(type) {
        return format('<code>%s</code>', type);
      }).filter(function(type) {
        return !!type;
      }).join(',');

      switch(tag.type) {
        case 'return':
          var description = tag.description ? md.render(tag.description).trim().replace(/\n/, '').replace(/^<p>|<\/p>$/gm, '') : '';

          if (tag.types) {
            return format('<tr><td>%s</td><td>%s</td></tr>', tag.types, description);
          }

          break;
        case 'returns':
          var description = tag.description ? md.render(tag.description).trim().replace(/\n/, '').replace(/^<p>|<\/p>$/gm, '') : '';

          if (tag.types) {
            return format('<tr><td>%s</td><td>%s</td></tr>', tag.types, description);
          }

          break;
        case 'param':
          var description = tag.description ? md.render(tag.description).trim().replace(/\n/, '').replace(/^<p>|<\/p>$/gm, '') : '';
          var name = tag.name ? format('<code>%s</code>', tag.name) : '';

          if (tag.types) {
            return format('<tr><td>%s</td><td>%s</td><td>%s</td></tr>', tag.types, name, description);
          }

          break;
        case 'throws':
          var description = tag.description ? md.render(tag.description).trim().replace(/\n/, '').replace(/^<p>|<\/p>$/gm, '') : '';

          if (tag.types) {
            return format('<tr><td>%s</td><td>%s</td></tr>', tag.types, description);
          }

          break;
      }
    }).filter(function(tag) {
      return tag && tag.length;
    }).join(''));
  });

  return returns.trim();
};

var cleanLineBreaks = function(html) {
  var start = new RegExp('<pre>','gmi');
  var end = new RegExp('</pre>','gmi');
  var isPre = new RegExp('^<pre>');
  var results = new Array();
  var strings = [];
  var last = 0;

  while (start.exec(html)) {
    results.push(start.lastIndex)
  }

  while (end.exec(html)) {
    results.push(end.lastIndex)
  }

  if (!results.length) {
    return html.replace(/\n/gm, '');
  }

  results = results.sort(function(a, b) {
    return a - b;
  });

  results.forEach(function(index, i) {
    if (i%2) {
      return;
    }

    if ((index-6 - last) >= 0) {
      strings.push(html.substring(last, index-5));
    }

    last = results[i+1];
    strings.push(html.substring(index-5, results[i+1]));
  });

  return strings.map(function(str) {
    if (isPre.test(str)) {
      return str;
    }

    return str.replace(/\n|<br>/gm, '');
  }).join('');
};

function parseTagTypes (str) {
  return str.replace(/[{}]/g, '').split(/ *[|,\/] */);
}

function parseTag (str) {
  var tag = {},
      parts = str.split(/ +/),
      type = tag.type = parts.shift().replace('@', '');

  switch (type) {
    case 'param':
      tag.types = parseTagTypes(parts.shift());
      tag.name = parts.shift() || '';
      tag.description = parts.join(' ');
      break;
    case 'return':
      tag.types = parseTagTypes(parts.shift());
      tag.description = parts.join(' ');
      break;
    case 'returns':
      tag.type = 'return'
      tag.types = parseTagTypes(parts.shift());
      tag.description = parts.join(' ');
      break;
    case 'throws':
      tag.type = 'throw'
      tag.types = parseTagTypes(parts.shift());
      tag.description = parts.join(' ');
      break;
    default:
      tag.string = parts.join(' ');
      break;
  }

  return tag;
}

module.exports = function(comments, aval, type) {
  if (!comments || !comments.length) {
    return undefined;
  }

  if (!Array.isArray(comments)) {
    comments = [comments];
  }

  var str = comments.join('').split('\n').map(function(line) {
    if (line.match(/^\s*$|^\*\s*$|^\s*?\*$|^\s*?\*\s*$/)) {
      return ' '
    }

    return line.replace(/^\s*?\*\s|^\s*?\*|^\*\s|^\s*?|^\**$/, '')
  }).join('\n');

  var comment = {
    tags: []
  };

  comment.description = str.split('\n@')[0].trim();
  if (!comment.description) {
    return;
  }

  // parse tags
  // parse comment body
  if (~str.indexOf('\n@')) {
    var tags = '@' + str.split('\n@').slice(1).join('\n@');
    comment.tags = tags.split('\n').map(parseTag);
  } else {
    var lines = str.split('\n')
    var tags = str.match(/^\s*?@.*/mg)

    if (tags) comment.tags = tags.map(function(str) {
      var line = lines.indexOf(str)
      if (line >= 0 && !lines[line+1].match(/^\s*?@.*/)) {
        str += ' ' + lines[line+1].trim()
      }

      return parseTag(str.trim())
    })

    if (comment.tags) {
      var first_tag = str.match(/^\s*?@.*/m)
      var new_description = ''

      if (first_tag) {
        new_description = str.slice(0, first_tag.index)
      }

      if (new_description) {
        comment.description = new_description.trim()
      }
    }
  }

  var doc = comment.description
  var html = cleanLineBreaks(md.render(comment.description).trim())

  if (comment.tags) {
    html += addTagsTable(comment.tags)
  }

  return html.concat(format('<link href=\'%s\' rel=\'stylesheet\' type=\'text/css\'>', css))
};