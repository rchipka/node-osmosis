/*jslint node: true */
'use strict';

/**
 * Search for nodes in the current Document.
 *
 * @function find
 * @param {Selector|contextCallback|Command.learn} selector
 * @memberof Command
 * @see {@link Command.select}
 * @instance
 */

/**
 * Search for nodes in the current context.
 *
 * @function select
 * @param {Selector|contextCallback|Command.learn} selector - A selector
 * @memberof Command
 * @see {@link Command.find}
 * @instance
 */

var Find = function (context, data, next, done) {
    var length, nodes, node, selector, i;

    if (this.selector !== undefined) {
        selector = this.selector;
    } else {
        selector = this.contextCallback(context, data);
    }

    if (this.relative === true) {
        nodes = context.find(selector);
    } else {
        nodes = context.doc().find(selector);
    }

    length = nodes.length;

    if (length === 0) {
        done('no results for "' + selector + '"');
        return;
    }

    if (this.getOpts().log === true) {
        this.log('found ' + length + ' results for "' + selector + '"');
    }

    for (i = 0; i < length; i++) {
        node = nodes[i];
        node.last = (length - 1 === i);
        node.index = i;
        next(node, data);
    }

    done();
};

module.exports.find =
module.exports.select = function (selector) {
    var self = this;

    if (typeof selector === 'function') {
        this.contextCallback = selector;
    } else if (selector instanceof Array) {
        this.selector = selector.join(', ');
    } else {
        this.selector = selector;
    }


    // Search relative to the context node
    if (this.name === 'select') {
        this.relative = true;
    } else {
        // Wait to see if we're a nested instance
        process.nextTick(function () {
            if (self.instance.parent !== undefined) {
                self.relative = true;
            }
        });
    }

    return Find;
};
