/*jslint node: true */
'use strict';

/**
 * Calls a callback with the current {@data} object.
 *
 * Note: Don't use this command to modify the {@data} object. Please use
 *  {@link Command.then} instead.
 *
 * @function data
 * @param {function} callback - A callback with an argument for {@data}
 * @memberof Command
 * @instance
 */

function Data(context, data, next, done) {
    this.args[0](data.getObject());
    next(context, data);
    done();
}

module.exports.data = Data;
