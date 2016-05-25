/**
 * Execute the immediately following command if each argument is true.
 *
 * An argument is considered to be `true` IF:
 *      - a {@link Selector} argument finds at least one node
 *      - a nested {@link Osmosis} instance:
 *          - Successfully {@link Command.set}s some data OR
 *          - There is at least one {@link context}
 *      - a {@link contextCallback} doesn't return false, null, or undefined
 *
 * @function if
 * @private
 * @param {Selector|Osmosis|contextCallback} [conditions]
 * @memberof Command
 * @instance
 * @see {@link Command.else}
 */

var If = function () {

};

If.compile = function (command) {
    var args   = command.args;

    length = args.length;
};

module.exports.if = If;
