/**
 * Set multiple HTTP headers. Short for `.config({ headers: ... })`
 *
 * @function headers
 * @param {object} headers - { headerName: headerValue, ... }
 * @memberof Command
 * @instance
 * @see Osmosis.header
 * @see Osmosis.config
 */

module.exports = function (obj) {

    var opts = this.config();

    if (opts.headers === undefined) {
        opts.headers = obj;
    } else {
        for (var key in obj) {
            opts.headers[key] = obj[key];
        }
    }

    return this;
};
