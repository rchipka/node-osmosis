/**
 * Parse HTML or XML data

 * @function parse
 * @param {string|buffer} data - XML/HTML data
 * @param {object} options - Parse options
 * @memberof Command
 * @instance
 * @see Osmosis.parse
 */

module.exports.parse = function (context, data, next, done) {
    var args = this.args;

    next(this.instance.parse(args[0], args[1]), data);
    done();
    return this;
};
