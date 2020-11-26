'use strict';

/**
 * Log in using a web page's login form.
 *
 * @function login
 * @memberof Command
 * @param {string} username - Username or email address
 * @param {string} password - Password
 * @instance
 * @see {@link Command.success}
 * @see {@link Command.fail}
 */

var form = require('../Form.js');

function Login(context, data, next, done) {
    var user = this.args[0],
        pass = this.args[1],
        params = {},
        loginForm = context.get('form:has(input[type="password"])'),
        self = this,
        userInput, passInput,
        nodes, i, method, url;

    if (loginForm === null) {
        done('No login form found');
        return;
    }

    userInput = loginForm.get('input[(not(@type) or @type="text") and @name]' +
                         ':before(input[type="password"]):last');

    if (!userInput) {
        done('No user field found');
        return;
    }

    passInput = userInput.get('following::input[type="password"]');

    if (!passInput) {
        done('No password field found');
        return;
    }

    params = form.getParams(loginForm);
    params[userInput.getAttribute('name')] = user;
    params[passInput.getAttribute('name')] = pass;

    url = form.getAction(loginForm);
    method = form.getMethod(loginForm);

    this.debug(method + ' ' + url + ' ' + JSON.stringify(params));

    this.request(method,
                 loginForm,
                 url,
                 params,
                 function (err, document) {
                     if (err === null) {
                         next(document, data);
                     }

                     done();
                 });
}

module.exports.login = function (username, password) {
    this.username = username;
    this.password = password;
    return Login;
};
