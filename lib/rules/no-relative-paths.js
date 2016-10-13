/**
 * @fileoverview Rule to disallow relative file paths
 * @author Arthur Lee <arthur@pinterest.com>
 */

var path = require('path');

"use strict";

//------------------------------------------------------------------------------
// Rule Definition
//------------------------------------------------------------------------------

function normalizeWebpackPath(path) {
    var pathComponents = path.split('!');
    if (pathComponents.length === 1) {
        return pathComponents[0];
    } else {
        return pathComponents[pathComponents.length - 1];
    }
}

function isRelativePath(path) {
    return path.startsWith('.');
}

module.exports = {
    meta: {
        docs: {
            description: "disallow relative file paths",
            category: "ECMAScript 6",
            recommended: false
        },
    },

    create: function(context) {
        return {
            ImportDeclaration: function(node) {
                var normalizedPath = normalizeWebpackPath(node.source.value);
                if (isRelativePath(normalizedPath)) {
                    context.report(node, 'Use imports that resolve from webapp/ instead of relative paths: ' + context.getSource(node));
                }
            },
            VariableDeclarator: function(node) {
                if (node.init && node.init.type === 'CallExpression' &&
                    node.init.callee.type === 'Identifier' &&
                    node.init.callee.name === 'require') {

                    if (node.init.arguments && node.init.arguments.length === 1) {
                        var requirePath = node.init.arguments[0].value;
                        if (requirePath && isRelativePath(normalizeWebpackPath(requirePath))) {
                            context.report(node, 'Use requires that resolve from webapp/ instead of relative paths: ' + context.getSource(node));
                        }
                    }
                }
            },
            MemberExpression: function(node) {
                if (node.object.type === 'Identifier' && node.object.name === 'jest' && node.property.type === 'Identifier') {
                    if (node.property.name === 'unmock' || node.property.name === 'mock') {
                        // jest.mock or jest.unmock
                        if (node.parent && node.parent.arguments && node.parent.arguments.length === 1) {
                            var usedPath = node.parent.arguments[0].value;
                            if (usedPath && isRelativePath(normalizeWebpackPath(usedPath))) {
                                context.report(node, 'When mocking/unmocking modules, use paths that resolve from webapp/ instead of relative paths: ' + context.getSource(node.parent));
                            }
                        }
                    }
                }
            }
        };
    }
};
