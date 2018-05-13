/**
 * Set a throttle. Short for `.config({ throttle: ... })`
 *
 * @function throttle
 * @memberof Command
 * @param {Number} tokensPerInterval Maximum number of tokens that can be
 *  removed at any given moment and over the course of one interval.
 * @param {String|Number} interval The interval length in milliseconds, or as
 *  one of the following strings: 'second', 'minute', 'hour', day'.
 * @see Osmosis.config
 */

var RateLimiter = require('limiter').RateLimiter;

module.exports = function (tokensPerInterval, interval) {
    var opts = this.getOpts();

    opts.throttle = new RateLimiter(
        tokensPerInterval || 1000,
        interval || 1
    );
    
    return this;
};
