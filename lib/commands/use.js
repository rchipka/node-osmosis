/**
 * Use a runtime defined variable
 *
 * @function use
 * @memberof Command
 * @instance
 * @see Command.run
 * @see Command.learn
 */

var Use = function () {
    return this.lookup(this.args[0]);
};

module.exports.use = function () {

};
