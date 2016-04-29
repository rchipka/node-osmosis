/**
 * Set a proxy. Short for `.config({ proxy: ... })`
 *
 * @param {string|array} proxy - A string or array of HTTP proxy URL(s)
 * @see Osmosis.config
 */

module.exports = function (value) {
    this.config('proxy', value);
    return this;
};
