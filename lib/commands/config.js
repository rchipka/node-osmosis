/**
 * Set configuration options for the **preceeding** command on down the chain
 *
 * @param {string|object} key - A `key` string or { key: value } object
 * @param {string} [value] - A value for the given `key`
 * @memberof Command
 */

module.exports = function (key, val) {
    var self = this, opts;

    if (self.name === undefined && self.prev !== undefined) {
        self = self.prev;
    }

    opts = self.getOpts();

    if (key === undefined) {
        return opts;
    }

    if (typeof key === 'object') {
        extend(opts, key, true);
    } else if (typeof key === 'function') {
        key(opts);
    } else {
        opts[key] = val;
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
    };
