/*jslint node: true */
'use strict';

function Data(context, data, next, done) {
    this.args[0](data.getObject());
    next(context, data);
    done();
}

module.exports.data = Data;
