/*jslint node: true */
'use strict';

/**
 * Continue if the context node contains the given string.
 *
 * @function follow
 * @memberof Command
 * @param {string|RegExp} match - A string to match.
 * @instance
 */

function Contains(context, data, next, done) {
    if (getContent(context).indexOf(this.string) !== -1) {
        next(context, data);
    } else {
        this.debug('"' + this.string + '" not found');
    }

    done();
}

function getContent(node) {
    if (node.text !== undefined) {
        return node.text();
    } else if (node.value !== undefined) {
        return node.value();
    }
}

module.exports.contains = function (string) {
    this.string = string;
    return Contains;
};
