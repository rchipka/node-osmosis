/*jslint node: true */
'use strict';

var externalURLRegex = /^((http:|https:)?\/\/|[^\/\.])/;

/**
 * Delay before continuing.
 *
 * @function get
 * @param {number} delay - A number of milliseconds or decimal of seconds.
 * contextCallback that calls a URL.
 * @memberof Command
 * @see Command.post
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
