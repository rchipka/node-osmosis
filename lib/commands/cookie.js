/**
 * Set a cookie. Short for `.config({ cookies: ... })`.
 *
 * Note: Setting a cookie to `null` will delete the cookie.
 *
 * @function cookie
 * @param {string} name - Cookie name
 * @param {string} value - Cookie value
 * @memberof Command
 * @instance
 * @see {@link Osmosis.config}
 * @see {@link Command.config}
 */

module.exports = function (name, value) {
    var opts = this.getOpts();

    if (!opts.hasOwnProperty('cookies')) {
        if (opts.cookies !== undefined) {
            opts.cookies = extend({}, opts.cookies);
        } else {
            opts.cookies = {};
        }
    }

    if (value === null) {
        delete opts.cookies[name];
    } else {
        opts.cookies[name] = value;
    }

    return this;
};

function extend(object, donor) {
    var key, keys = Object.keys(donor),
                i = keys.length;

    while (i--) {
        key = keys[i];
        object[key] = donor[key];
    }

    return object;
}
