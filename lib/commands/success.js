/*jslint node: true */
'use strict';

/**
 * Continue if the selector matches any nodes.
 *
 * @param {Selector} selector - A selector to match.
 */

function Success(context, data, next, done) {
    if (context.find(this.selector).length > 0) {
        next(context, data);
    } else {
        this.log(this.selector + 'not found');
    }

    done();
}

module.exports.success = function (selector) {
    this.selector = selector;
    return Success;
};
