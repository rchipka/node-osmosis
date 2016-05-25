/*jslint node: true */
'use strict';

/**
 * Continue if the given selector does NOT match any nodes.
 *
 * If a node is found, a {@link Command.error} message well be sent.
 *
 * @function fail
 * @memberof Command
 * @param {Selector} selector - A selector to match.
 * @instance
 * @see {@link Command.login}
 * @see {@link Command.filter}
 */

function Fail(context, data, next, done) {
    if (context.find(this.selector).length > 0) {
        this.error('found ' + this.selector);
    } else {
        next(context, data);
    }

    done();
}

module.exports.fail = function (selector) {
    this.selector = selector;
    return Fail;
};
