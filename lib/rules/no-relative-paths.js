/**
 * @fileoverview Rule to disallow relative file paths
 * @author Arthur Lee <arthur@pinterest.com>
 */

var path = require('path');

"use strict";

//------------------------------------------------------------------------------
// Rule Definition
//------------------------------------------------------------------------------

function isWebpackMagicPath(path) {
    return path.indexOf('!') !== -1;
}

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

function generateRootPath(filePath) {
    return function(relPath) {
        var absPath = path.resolve(path.dirname(filePath), relPath);
        var match = absPath.match(/pinboard\/webapp\/(.*)/);
        return match && match.length > 1 && JSON.stringify(match[1]);
    }
}

function checkPath(inputPath, callback) {
    if (!inputPath) {
        return;
    }
    var normalizedPath = normalizeWebpackPath(inputPath);
    var shouldReport = isRelativePath(normalizedPath);
    if (shouldReport) {
        callback(/* isAutofixable */ !isWebpackMagicPath(inputPath));
    }
}

var message = 'Use paths that resolve from webapp/ instead of relative paths: ';

module.exports = {
    meta: {
        docs: {
            description: "disallow relative file paths",
            category: "ECMAScript 6",
            recommended: false
        },
        fixable: "code"
    },

    create: function(context) {
        var generateFixedPath = generateRootPath(context.getFilename());
        return {
            ImportDeclaration: function(node) {
                checkPath(node.source.value, function(isAutofixable) {
                    var report = {
                        node: node,
                        message: message + context.getSource(node)
                    };
                    var fixedPath = generateFixedPath(node.source.value);
                    if (isAutofixable && fixedPath) {
                        report['fix'] = function(fixer) {
                            return fixer.replaceText(node.source, fixedPath);
                        }
                    }
                    context.report(report);
                });
            },
            CallExpression: function(node) {
                if (node.callee.type === 'Identifier' &&
                    node.callee.name === 'require') {

                    if (node.arguments && node.arguments.length === 1) {
                        var requirePath = node.arguments[0].value;
                        checkPath(requirePath, function(isAutofixable) {
                            var report = {
                                node: node,
                                message: message + context.getSource(node)
                            };
                            var fixedPath = generateFixedPath(requirePath);
                            if (isAutofixable && fixedPath) {
                                report['fix'] = function(fixer) {
                                    return fixer.replaceText(node.arguments[0], fixedPath);
                                }
                            }
                            context.report(report);
                        });
                    }
                }
            },
            MemberExpression: function(node) {
                if (node.object.type === 'Identifier' && node.object.name === 'jest' && node.property.type === 'Identifier') {
                    if (node.property.name === 'unmock' || node.property.name === 'mock') {
                        // jest.mock or jest.unmock
                        if (node.parent && node.parent.arguments && node.parent.arguments.length === 1) {
                            var usedPath = node.parent.arguments[0].value;
                            checkPath(usedPath, function(isAutofixable) {
                                var report = {
                                    node: node,
                                    message: message + context.getSource(node.parent)
                                };
                                var fixedPath = generateFixedPath(usedPath);
                                if (isAutofixable && fixedPath) {
                                    report['fix'] = function(fixer) {
                                        return fixer.replaceText(node.parent.arguments[0], fixedPath);
                                    }
                                }
                                context.report(report);
                            });
                        }
                    }
                }
            }
        };
    }
};
