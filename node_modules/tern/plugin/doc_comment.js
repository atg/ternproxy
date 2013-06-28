// Parses comments above variable declarations, function declarations,
// and object properties as docstrings and JSDoc-style type
// annotations.

var hljs = require('highlight.js'),
    marked = require('marked');

marked.setOptions({
  gfm: true,
  tables: true,
  breaks: true,
  pedantic: false,
  sanitize: true,
  smartLists: true,
  smartypants: true,
  langPrefix: 'language-',
  highlight: function (code, lang) {
    if(lang) return hljs.highlight(lang, code).value;
    return hljs.highlightAuto(code).value;
  }
});

(function(mod) {
  if (typeof exports == "object" && typeof module == "object") // CommonJS
    return mod(require("../lib/infer"), require("../lib/tern"), require("../lib/comment"),
               require("acorn/util/walk"));
  if (typeof define == "function" && define.amd) // AMD
    return define(["../lib/infer", "../lib/tern", "../lib/comment", "acorn/util/walk"], mod);
  mod(tern, tern, tern.comment, acorn.walk);
})(function(infer, tern, comment, walk) {
  "use strict";

  tern.registerPlugin("doc_comment", function() {
    return {
      passes: {
        "postParse": postParse,
        "postInfer": postInfer
      }
    };
  });

  function postParse(ast, text) {
    function attachComments(node) { comment.ensureCommentsBefore(text, node); }

    walk.simple(ast, {
      VariableDeclaration: attachComments,
      FunctionDeclaration: attachComments,
      AssignmentExpression: function(node) {
        if (node.operator == "=") attachComments(node);
      },
      ObjectExpression: function(node) {
        for (var i = 0; i < node.properties.length; ++i)
          attachComments(node.properties[i].key);
      }
    });
  }

  function postInfer(ast, scope) {
    walk.simple(ast, {
      VariableDeclaration: function(node, scope) {
        if (node.commentsBefore)
          interpretComments(node, node.commentsBefore, scope,
                            scope.getProp(node.declarations[0].id.name));
      },
      FunctionDeclaration: function(node, scope) {
        if (node.commentsBefore)
          interpretComments(node, node.commentsBefore, scope,
                            scope.getProp(node.id.name),
                            node.body.scope.fnType);
      },
      AssignmentExpression: function(node, scope) {
        if (node.commentsBefore)
          interpretComments(node, node.commentsBefore, scope,
                            infer.expressionType({node: node.left, state: scope}));
      },
      ObjectExpression: function(node, scope) {
        for (var i = 0; i < node.properties.length; ++i) {
          var prop = node.properties[i], key = prop.key;
          if (key.commentsBefore)
            interpretComments(prop, key.commentsBefore, scope,
                              node.objType.getProp(key.name));
        }
      }
    }, infer.searchVisitor, scope);
  }

  // (The MIT License)
  //
  // Copyright (c) 2011 TJ Holowaychuk <tj@vision-media.ca>
  // Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the 'Software'), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
  // The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
  // THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
  function parseTagTypes (str) {
    return str.replace(/[{}]/g, '').split(/ *[|,\/] */);
  }

  // (The MIT License)
  //
  // Copyright (c) 2011 TJ Holowaychuk <tj@vision-media.ca>
  // Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the 'Software'), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
  // The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
  // THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
  function parseTag (str) {
    var tag = {}
      , parts = str.split(/ +/)
      , type = tag.type = parts.shift().replace('@', '');

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
      case 'see':
        if (~str.indexOf('http')) {
          tag.title = parts.length > 1
            ? parts.shift()
            : '';
          tag.url = parts.join(' ');
        } else {
          tag.local = parts.join(' ');
        }
      case 'api':
        tag.visibility = parts.shift();
        break;
      case 'type':
        tag.types = parseTagTypes(parts.shift());
        break;
      case 'memberOf':
        tag.parent = parts.shift();
        break;
      case 'augments':
        tag.otherClass = parts.shift();
        break;
      case 'borrows':
        tag.otherMemberName = parts.join(' ').split(' as ')[0];
        tag.thisMemberName = parts.join(' ').split(' as ')[1];
        break;
      case 'throws':
        tag.types = parseTagTypes(parts.shift());
        tag.description = parts.join(' ');
        break;
      default:
        tag.string = parts.join(' ');
        break;
    }

    return tag;
  }

  // COMMENT INTERPRETATION
  function interpretComments(node, comments, scope, aval, type) {
    jsdocInterpretComments(node, scope, aval, comments);

    if (!type && aval instanceof infer.AVal && aval.types.length) {
      type = aval.types[aval.types.length - 1];
      if (!(type instanceof infer.Obj) || type.origin != infer.cx().curOrigin || type.doc)
        type = null;
    }

    if(!comments.length) return null;

    var str = comments.join('').split('\n').map(function (line) {
      if(line.match(/^\s*$|^\*\s*$|^\s\*$|^\s\*\s*$/)) return ' '
      return line.replace(/^\s\*\s|^\s\*|^\*\s|^\s|^\**$/, '')
    }).join('\n')

    // (The MIT License)
    //
    // Copyright (c) 2011 TJ Holowaychuk <tj@vision-media.ca>
    // Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the 'Software'), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
    // The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
    // THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
    var comment = {tags: []};
    // parse comment body
    comment.description = str.split('\n@')[0].trim();
    // parse tags
    if (~str.indexOf('\n@')) {
      var tags = '@' + str.split('\n@').slice(1).join('\n@');
      comment.tags = tags.split('\n').map(parseTag);
      comment.isPrivate = comment.tags.some(function(tag){
        return 'api' == tag.type && 'private' == tag.visibility;
      })
    }

    if(comment.description) comment.description = marked(comment.description).trim().replace(/\n/mg, '')
    if (aval instanceof infer.AVal) aval.doc = comment.description;
    if (type) type.doc = comment.description;
  }

  // Parses a subset of JSDoc-style comments in order to include the
  // explicitly defined types in the analysis.

  function skipSpace(str, pos) {
    while (/\s/.test(str.charAt(pos))) ++pos;
    return pos;
  }

  function parseLabelList(scope, str, pos, close) {
    var labels = [], types = [];
    for (var first = true; ; first = false) {
      pos = skipSpace(str, pos);
      if (first && str.charAt(pos) == close) break;
      var colon = str.indexOf(":", pos);
      if (colon < 0) return null;
      var label = str.slice(pos, colon);
      if (!/^[\w$]+$/.test(label)) return null;
      labels.push(label);
      pos = colon + 1;
      var type = parseType(scope, str, pos);
      if (!type) return null;
      pos = type.end;
      types.push(type.type);
      pos = skipSpace(str, pos);
      var next = str.charAt(pos);
      ++pos;
      if (next == close) break;
      if (next != ",") return null;
    }
    return {labels: labels, types: types, end: pos};
  }

  function parseType(scope, str, pos) {
    pos = skipSpace(str, pos);
    var type;

    if (str.indexOf("function(", pos) == pos) {
      var args = parseLabelList(scope, str, pos + 9, ")"), ret = infer.ANull;
      if (!args) return null;
      pos = skipSpace(str, args.end);
      if (str.charAt(pos) == ":") {
        ++pos;
        var retType = parseType(scope, str, pos + 1);
        if (!retType) return null;
        pos = retType.end;
        ret = retType.type;
      }
      type = new infer.Fn(null, infer.ANull, args.types, args.labels, ret);
    } else if (str.charAt(pos) == "[") {
      var inner = parseType(scope, str, pos + 1);
      if (!inner) return null;
      pos = skipSpace(str, inner.end);
      if (str.charAt(pos) != "]") return null;
      ++pos;
      type = new infer.Arr(inner.type);
    } else if (str.charAt(pos) == "{") {
      var fields = parseLabelList(scope, str, pos + 1, "}");
      if (!fields) return null;
      type = new infer.Obj(true);
      for (var i = 0; i < fields.types.length; ++i) {
        var field = type.defProp(fields.labels[i]);
        field.initializer = true;
        fields.types[i].propagate(field);
      }
      pos = fields.end;
    } else {
      var start = pos;
      while (/[\w$]/.test(str.charAt(pos))) ++pos;
      if (start == pos) return null;
      var word = str.slice(start, pos);
      if (/^(number|integer)$/i.test(word)) type = infer.cx().num;
      else if (/^bool(ean)?$/i.test(word)) type = infer.cx().bool;
      else if (/^string$/i.test(word)) type = infer.cx().str;
      else {
        var found = scope.hasProp(word);
        if (found) found = found.getType();
        if (!found) {
          type = infer.ANull;
        } else if (found instanceof infer.Fn && /^[A-Z]/.test(word)) {
          var proto = found.getProp("prototype").getType();
          if (proto instanceof infer.Obj) type = infer.getInstance(proto);
        } else {
          type = found;
        }
      }
    }
    return {type: type, end: pos};
  }

  function parseTypeOuter(scope, str, pos) {
    pos = skipSpace(str, pos || 0);
    if (str.charAt(pos) != "{") return null;
    var result = parseType(scope, str, pos + 1);
    if (!result || str.charAt(result.end) != "}") return null;
    ++result.end;
    return result;
  }

  function jsdocInterpretComments(node, scope, aval, comments) {
    var type, args, ret, foundOne;

    for (var i = 0; i < comments.length; ++i) {
      var comment = comments[i];
      var decl = /(?:\n|$|\*)\s*@(type|param|arg(?:ument)?|returns?)\s+(.*)/g, m;
      while (m = decl.exec(comment)) {
        var parsed = parseTypeOuter(scope, m[2]);
        if (!parsed) continue;
        foundOne = true;

        switch(m[1]) {
        case "returns": case "return":
          ret = parsed.type; break;
        case "type":
          type = parsed.type; break;
        case "param": case "arg": case "argument":
          var name = m[2].slice(parsed.end).match(/^\s*([\w$]+)/);
          if (!name) continue;
          (args || (args = Object.create(null)))[name[1]] = parsed.type;
          break;
        }
      }
    }

    if (foundOne) applyType(type, args, ret, node, aval);
  };

  function applyType(type, args, ret, node, aval) {
    var fn;
    if (node.type == "VariableDeclaration") {
      var decl = node.declarations[0];
      if (decl.init && decl.init.type == "FunctionExpression") fn = decl.init.body.scope.fnType;
    } else if (node.type == "FunctionDeclaration") {
      fn = node.body.scope.fnType;
    } else if (node.type == "AssignmentExpression") {
      if (node.right.type == "FunctionExpression")
        fn = node.right.body.scope.fnType;
    } else { // An object property
      if (node.value.type == "FunctionExpression") fn = node.value.body.scope.fnType;
    }

    if (fn && (args || ret)) {
      if (args) for (var i = 0; i < fn.argNames.length; ++i) {
        var name = fn.argNames[i], known = args[name];
        if (known) known.propagate(fn.args[i]);
      }
      if (ret) ret.propagate(fn.retval);
    } else if (type) {
      type.propagate(aval);
    }
  };
});