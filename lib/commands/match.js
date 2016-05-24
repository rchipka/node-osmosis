/*jslint node: true */
'use strict';

/**
 * Continue if the context node innerText matches a RegExp.
 *
 * @function match
 * @memberof Command
 * @param {string|RegExp} match - A RegExp to match.
 * @instance
 */

function Match(context, data, next, done) {
    if (this.regex.test(getContent(context))) {
        next(context, data);
    } else {
        this.debug('"' + this.regex.toString() + '" not found');
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

module.exports.match = function (regex) {
    this.regex = regex;
    return Match;
};
