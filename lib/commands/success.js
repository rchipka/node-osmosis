/*jslint node: true */
'use strict';

/**
 * Continue if the given selector matches any nodes.
 *
 * If no nodes are found, a {@link Command.error} message will be sent.
 *
 * @function success
 * @memberof Command
 * @param {Selector} selector - A selector to match.
 * @instance
 * @see {@link Command.login}
 * @see {@link Command.filter}
 */

function Success(context, data, next, done) {
    if (context.find(this.selector).length > 0) {
        next(context, data);
    } else {
        this.error(this.selector + ' not found');
    }

    done();
}

module.exports.success = function (selector) {
    this.selector = selector;
    return Success;
};
