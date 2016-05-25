/**
 * Osmosis learns to find dynamic content via static selectors.
 *
 * @function learn
 * @memberof Command
 * @param {string} name - The name of the runtime variable
 * @instance
 * @see {@link Command.use}
 */

var Learn = function (context) {
    var name     = this.args[0],
        selector = this.lookup(selector),
        tData    = this.trainingData,
        nodes, i;

    if (selector === undefined) {
        // No definition, use the learned selector.
        return;
    } else {
        nodes = context.find(selector);

        for (i = 0; i < nodes.length; i++) {
            this.nodeSet.push(nodes[i]);
        }

        this.selector = getSelector(this.nodeSet);
    }
};

function getSelector(nodes, isParent) {

    var node     = nodes[0],
        classes  = node.classList,
        selector = '',
        i, parentSelector, className, matches,
        position;

    if (nodes.length === 0) {
        return '';
    }

    if (match(nodes, nodeId)) {
        return '#' + node.id;
    }

    if (match(nodes, nodeName)) {
        selector += nodeName;
    }

    // Find common class names
    for (i = 0; i < classes.length; i++) {
        className = classes[i];
        matches   = [];

        if (match(nodes, nodeHasClass, className)) {
            matches.push(className);
        }

        selector = '.' + matches.join('.');
    }

    parentSelector = getSelector(parents(nodes), true);

    if (node.parentNode && isParent !== true) {
        position = node.parentNode.childNodes.indexOf(node);

        if (match(nodes, nodePosition)) {
            selector += ':nth-of-type(' + position + ')';
        }
    }

    if (parentSelector.length > 0) {
        return parentSelector + ' > ' + selector;
    }

    return selector;
}

function match(nodes, cb, arg) {

    var value = cb(nodes[0], arg), i;

    for (i = 1; i < nodes.length; i++) {
        if (cb(nodes[i], arg) !== value) {
            return false;
        }
    }

    return true;
}

function parents(nodes) {
    var arr    = [],
        i      = 0,
        length = nodes.length,
        parent;


    for (i = 0; i < nodes.length; i++) {
        parent = nodes[i].parentNode;

        if (parent) {
            arr.push(parent);
        }
    }

    return arr;
}

function nodeName(node) {
    return node.nodeName;
}

function nodeId(node) {
    return node.id;
}

function nodeHasClass(node, className) {
    return node.classList.indexOf(className) !== -1;
}

function nodePosition(node) {
    return node.parentNode.childNodes.indexOf(node);
}

module.exports.learn = function () {
    this.nodeSet = [];
    return Learn;
};
