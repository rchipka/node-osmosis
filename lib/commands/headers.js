/**
 * Set multiple HTTP headers. Short for `.config({ headers: ... })`.
 *
 * @function headers
 * @param {object} headers - { headerName: headerValue, ... }
 * @memberof Command
 * @instance
 * @see Osmosis.header
 * @see Osmosis.config
 */

module.exports = function (headers) {
    var opts = this.getOpts(), key;

    if (opts.hasOwnProperty('headers')) {
        for (key in headers) {
            opts.headers[key] = headers[key];
        }
    } else {
        this.setOpt('headers', headers);
    }

    return this;
};
