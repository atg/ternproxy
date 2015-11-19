// / Given a tern function type declaration, tokenize it into "()>," and identifiers.
function tokenize (txt) {
  // "fn(" => "("
  txt = txt.replace(/fn\(/g, '(')

  // "->"  => ">"
  txt = txt.replace(/->/g, '>')

  // Get rid of {a, b, c} object literals
  txt = txt.replace(/\{[^\}]+\}/g, 'Object')

  var tokens = []
  var ident = ''
  for (var i = 0, n = txt.length; i != n; i++) {
    var c = txt[i]

    // Ignore whitespace
    if (c == ' ' || c == '\t') {
      continue
    }
    else if (c == '(' || c == ')' || c == '>' || c == ',') {
      // Lex idents if we see a special character
      if (ident) {
        tokens.push(ident)
        ident = ''
      }

      tokens.push(c)
    } else {
      ident += c
    }
  }

  if (ident)
    tokens.push(ident)

  return tokens
}

function ast_node () {
  return { 'args': [], 'ret': null }
}

// / Return the last element in an array.
function last (xs) {
  var n = xs.length
  return n > 0 ? xs[n - 1] : null
}

// / Parse a tern function type string into an AST representation.
function parser (txt) {
  if (!txt) {
    return undefined;
  }

  var tokens = tokenize(txt)

  var root = ast_node()
  var stack = [root]
  var lastNode = last(stack)

  var argsMode = false
  tokens.forEach(function(T) {
    if (T === '(') {
      var node = ast_node()

      // Add to the parent function
      var parent = last(stack)
      if (argsMode) {
        parent.args.push(node)
      } else {
        lastNode.ret = node
      }

      stack.push(node)
    }
    else if (T === ')') {
      lastNode = last(stack)
      stack.pop()
    }
    else if (T === '>' || T === ',') {
      // do nothing
    } else {
      var parent = last(stack)
      if (argsMode) {
        parent.args.push(T)
      } else {
        lastNode.ret = T
      }
    }

    argsMode = (T !== '>')
  })

  return root['ret']
}

// / Print an AST approximately as it was before it was parsed.
function repr (obj) {
  if (typeof obj === 'string')
    return obj

  var args = []
  obj.args.forEach(function(arg) {
    args.push(repr(arg))
  })

  var txt = 'fn(' + args.join(', ') + ')'

  if (obj.ret !== null)
    txt += ' -> ' + repr(obj.ret)

  return txt
}

function joinElements (xs, bop) {
  var n = xs.length
  var results = []
  for (var i = 0; i < n;) {
    var left = xs[i]
    if (i + 1 === n) {
      results.push(left)
      break
    }

    var right = xs[i + 1]
    var combined = bop(left, right)
    if (combined == null) {
      results.push(left)
      i++
    } else {
      results.push(combined)
      i += 2
    }
  }
  return results
}

function endsWithColon (txt) {
  return txt.length > 0 && txt[txt.length - 1] === ':'
}

// / Clean a list of function arguments, for instance "foo:, bar, baz" becomes "foo, baz"
function cleanArguments (snips) {
  // Join label arguments ("compare:", with the following type)
  snips = joinElements(snips, function(left, right) {
    if (left === '' || right === '')
      return null

    if (!endsWithColon(left)) {
      // But if it's just a name then leave it be
      return null
    }

    if (right.indexOf('function(') === 0)
      return right

    return left.substr(0, left.length - 1)
  })

  snips = snips.map(function(arg) {
    // Some parameters are of the form "name:type", so we split it to get just the name
    if (arg.indexOf(':') > 0)
      if (arg.indexOf('function(') !== 0)
        return arg.split(':')[0]
    return arg
  })

  return snips
}

// / Given an AST, return a chocolat snippet suitable for code completion.
function snippet (obj) {
  // Act one: compile the arguments
  var snips = []
  obj.args.forEach(function(arg) {
    if (typeof arg === 'string') {
      snips.push(arg)
    } else {
      var innerArgs = []
      arg.args.forEach(function(x) {
        if (typeof x === 'string')
          innerArgs.push(x)
      })

      innerArgs = cleanArguments(innerArgs)

      var snip = 'function(' + innerArgs.join(', ') + ') {%{SECONDARY_SNIPPET_INDEX}}'
      snips.push(snip)
    }
  })

  // Act two: clean the arguments
  snips = cleanArguments(snips)

  // If the last argument is called context then get rid of it, it's evil!
  if (snips.length)
    if (snips[snips.length - 1] === 'context' || snips[snips.length - 1] === 'context?')
      snips.pop();

  // Finally join the arguments into a snippet
  snips = snips.map(function(arg) {
    return '%{PRIMARY_SNIPPET_INDEX="' + arg + '"}'
  })

  var tabstop_counter = 1
  var snippetText = '(' + snips.join(', ') + ')'

  var replacer = function() {
    return String(tabstop_counter++)
  }

  snippetText = snippetText.replace(/PRIMARY_SNIPPET_INDEX/g, replacer)
  snippetText = snippetText.replace(/SECONDARY_SNIPPET_INDEX/g, replacer)

  return snippetText
}

module.exports = function(str) {
  var ast = parser(str)
  return (ast && ast.args) ? snippet(ast) : undefined
}
