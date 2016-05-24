/*jslint node: true */
'use strict';

/**
 * Execute each argument asynchronously using the current context and data.
 *
 * After each argument has finished, {@link Command.do} will continue to the
 * immediately following command using the original {@link context}.
 *
 * @function do
 * @memberof Command
 * @param {...(Osmosis|middlewareCallback)} function - Callbacks or instances
 * @instance
 */

var Do = function (context, data, next, done) {
    var args   = this.args,
        length = args.length,
        pending = length,
        dataDone = function () {
            if (--pending !== 0) {
                return;
            }

            next(context, data);
            done();
        }, i;

    for (i = 0; i < length; i++) {
        args[i].start(context, data.child().done(dataDone));
    }
};

module.exports.do = Do;
