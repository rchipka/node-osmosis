/*jslint node: true */
'use strict';

/**
 * Delay each context before continuing down the chain.
 *
 * @function delay
 * @param {number} delay - A number of milliseconds or a float of seconds.
 * @memberof Command
 * @instance
 */

function Delay(context, data, next, done) {
    var delay = this.delay, self = this;

    if (this.timeout === undefined) {
        this.timeout = delay;
    }

    setTimeout(function () {
        self.timeout -= delay;
        next(context, data);
        done();
    }, this.timeout);

    this.timeout += delay;
}


module.exports.delay = function (delay) {
    this.delay = delay;

    if (this.delay % 1 !== 0) {
        this.delay = this.delay * 1000;
    }

    return Delay;
};
