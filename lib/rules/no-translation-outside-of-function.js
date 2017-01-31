//------------------------------------------------------------------------------
// Rule Definition
//------------------------------------------------------------------------------

module.exports = function (context) {
    var functionCounter = 0;

    return {
        "FunctionExpression": function() {
            functionCounter++;
        },

        "FunctionExpression:exit": function() {
            functionCounter--;
        },

        "ArrowFunctionExpression": function() {
            functionCounter++;
        },

        "ArrowFunctionExpression:exit": function() {
            functionCounter--;
        },

        "FunctionDeclaration": function() {
            functionCounter++;
        },

        "FunctionDeclaration:exit": function() {
            functionCounter--;
        },

        "CallExpression": function (node) {
            if (functionCounter > 0 ||
                    node.callee.type !== 'MemberExpression' ||
                    node.callee.object.type !== 'Identifier' ||
                    node.callee.object.name !== 'i18n' ||
                    node.callee.property.type !== 'Identifier' ||
                    node.callee.property.name !== '_') {
                return;
            }

            context.report(node, 'P.i18n._() may only be called from inside a function after the locale has been loaded: ' + context.getSource(node));
        }
    };

};
