/**
 * @fileoverview Rule to only allow imports from certain paths
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

// "root path" refers to paths relative to webapp/
function rootPathFromAbs(path) {
    var match = path.match(/pinboard\/webapp\/(.*)/);
    return match && match.length > 1 && match[1];
}

function rootPathFromRel(relPath, root) {
    var absPath = path.resolve(root, relPath);
    return rootPathFromAbs(absPath);
}

function normalizePath(path, root) {
    if (isWebpackMagicPath(path)) {
        path = normalizeWebpackPath(path);
    }
    if (isRelativePath(path)) {
        path = rootPathFromRel(path, root);
    }
    
    return path;
}

function isRelativePath(path) {
    return path.startsWith('.');
}

function isAliasedPath(aliases, importPath) {
    for (var i=0; i < aliases.length; i++) {
        if (importPath.startsWith(aliases[i] + '/')) {
            return true;
        }
    }
    return false;
}

// Return true if one of "rules" is fulfilled
function checkRules(rules, aliases, selfPath, importPath) {
    // Not an aliased path, which means we are importing a node module
    if (aliases !== null && !isAliasedPath(aliases, importPath)) {
        return true;
    }
    
    for (var i=0; i < rules.length; i++) {
        var fromRegex = new RegExp(rules[i].from);
        var toRegex = new RegExp(rules[i].to);
        
        // check if rule applies to me
        if (fromRegex.test(selfPath) && toRegex.test(importPath)) {
            return true;
        }
    }
    return false;
};

function getChecker(context) {
    var options = (context.options && context.options[0]) || {};
    var aliases = options['aliases'];
    var whitelist = options['whitelisted-imports'] || [];
    var blacklist = options['blacklisted-imports'] || [];
    var selfPath = rootPathFromAbs(context.getFilename());

    return function(inputPath, callback) {
        if (!inputPath) return;
        
        var importPath = normalizePath(inputPath, path.dirname(context.getFilename()));
        
        // look for at least one rule fulfilled from the whitelist
        // make sure no rules are broken from the blacklist
        if (!checkRules(whitelist, aliases, selfPath, importPath) ||
            checkRules(blacklist, null, selfPath, importPath)) {
            callback('Import disallowed by rules: ' + inputPath);
        }
    };
}

module.exports = {
    meta: {
        docs: {
            description: "disallow require/imports that are not whitelisted",
            category: "ECMAScript 6",
            recommended: false
        }
    },

    create: function(context) {
        var checkPath = getChecker(context);
        return {
            ImportDeclaration: function(node) {
                checkPath(node.source.value, function(message) {
                    context.report({
                        node: node,
                        message: message
                    });
                });
            },
            CallExpression: function(node) {
                if (node.callee.type === 'Identifier' &&
                    node.callee.name === 'require') {

                    if (node.arguments && node.arguments.length === 1) {
                        var requirePath = node.arguments[0].value;
                        checkPath(requirePath, function(message) {
                            context.report({
                                node: node,
                                message: message
                            });
                        });
                    }
                }
            }
        };
    }
};
