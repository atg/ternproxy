var infer = require('tern/lib/infer');
var tern = require('tern/lib/tern');
var acorn = require('acorn/dist/acorn');
var walk = require('acorn/dist/walk');
var inject = require('acorn-jsx/inject');

// Override acorn.walk with JSX
// see https://github.com/chtefi/acorn-jsx-walk/blob/master/index.js
var overrideAcornWalkBase = function() {
  var base = walk.base;
  base.JSXElement = function(node, st, c) {
    node.children.forEach(function(n) {
      c(n, st);
    });
  };

  base.JSXExpressionContainer = function(node, st, c) {
    c(node.expression, st);
  };

  base.JSXEmptyExpression = function(node, st, c) {
    c(node, st);
  };
};

var overrideTernScopeGatherer = function() {
  // if (!infer.scopeGatherer) return;
  var scopeGatherer = infer.scopeGatherer;
  scopeGatherer['JSXElement'] = function(node, scopes, c) {
    // console.log(node)
  };
};

var overrideTernInferWrapper = function() {
  // if (!infer.inferWrapper) return;
  var inferWrapper = infer.inferWrapper;
  inferWrapper['JSXElement'] = function(node, scopes, c) {
    // console.log(node)
  };
};

var overrideTernTypeFinder = function() {
  // if (!infer.typeFinder) return;
  var typeFinder = infer.typeFinder;
  typeFinder['JSXElement'] = function(node, scope) {
    // console.log(node)
    return scope;
  };
};

var overrideTernSearchVisitor = function() {
  // if (!infer.searchVisitor) return;
  var searchVisitor = infer.searchVisitor;
  searchVisitor['JSXElement'] = function(node, scopes, c) {
    // console.log(node)
  };
};

tern.registerPlugin('jsx', function(server, options) {
  inject(acorn);
  overrideAcornWalkBase();
  overrideTernScopeGatherer();
  overrideTernInferWrapper();
  overrideTernTypeFinder();
  overrideTernSearchVisitor();
});
