/**
 * Set a proxy. Short for `.config({ proxy: ... })`
 *
 * @function proxy
 * @memberof Command
 * @param {string|array} proxy - A string or array of HTTP proxy URL(s)
 * @instance
 * @see Osmosis.config
 */

module.exports = function (value) {
    this.getOpts().proxy = value;
    return this;
};
