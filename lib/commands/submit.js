/*jslint node: true */
'use strict';

/**
 * Submit a form.
 *
 * @function submit
 * @memberof Command
 * @param {Selector} selector - A selector for a <form> or submit button.
 * @param {object|contextCallback} params - Keys/values for the form's inputs.
 * @instance
 */

var form = require('../Form.js');

function Submit(context, data, next, done) {
    var node = context.get(this.selector),
        method, url, params, param;

    if (node === null) {
        return done('No results for ' + this.selector);
    }

    method = form.getMethod(node);
    url    = form.getAction(node);
    params = form.getParams(node);

    if (typeof this.params === 'function') {
        this.params = this.params(context, data.getObject());
    }

    for (param in this.params) {
        params[param] = this.params[param];
    }

    this.request(method, node, url, params, function (err, document) {
        if (err === null) {
            next(document, data);
        }

        done();
    });
}

module.exports.submit = function (selector, params) {
    this.selector = selector;
    this.params = params;
    return Submit;
};
