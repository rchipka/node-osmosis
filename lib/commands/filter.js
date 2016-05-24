/*jslint node: true */
'use strict';

/**
 * Check that the context node matches the given selector.
 *
 * @function filter
 * @memberof Command
 * @param {Selector} match - A Selector to match
 * @instance
 */


function Filter(context, data, next, done) {
    if (context.find(this.selector).length > 0) {
        next(context, data);
    }

    done();
}

module.exports.filter = function (selector) {
    this.selector = selector;
    return Filter;
};
