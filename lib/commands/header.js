/**
 * Set an HTTP header. Short for `.config({ headers: ... })`
 *
 * @function header
 * @param {string} name - Header name
 * @param {string} value - Header value
 * @memberof Command
 * @instance
 * @see Osmosis.headers
 * @see Osmosis.config
 */

module.exports = function (name, value) {
    var opts = this.getOpts(), headers;

    if (opts.hasOwnProperty('headers')) {
        opts.headers[name] = value;
    } else {
        headers = {};
        headers[name] = value;
        this.setOpt('headers', headers);
    }

    return this;
};
