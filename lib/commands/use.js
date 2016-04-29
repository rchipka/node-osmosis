/**
 * Use a runtime defined variable
 *
 * @see Command.run
 * @see Command.learn
 */

var Use = function(context, data, next, done) {
    return this.lookup(this.args[0]);
}

module.exports.use = function(selector) {

}
