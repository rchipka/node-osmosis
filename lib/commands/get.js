/*jslint node: true */
'use strict';

var externalURLRegex = /^((http:|https:)?\/\/|[^\/\.])/;

/**
 * Make an HTTP GET request.
 *
 * @function get
 * @param {(string|contextCallback)} url - An absolute or relative URL or a
 * contextCallback that calls a URL.
 * @param {object|contextCallback} [params] - HTTP GET query parameters
 * @memberof Command
 * @instance
 * @see {@link Command.post}
 */

/**
 * Make an HTTP POST request.
 * @function post
 * @param {(string|contextCallback)} url - An absolute or relative URL or a
 * contextCallback that calls a URL.
 * @param {object|contextCallback} [data] - HTTP POST data
 * @memberof Command
 * @instance
 * @see {@link Command.get}
 */

function Get(context, data, next, done) {
    this.request(this.name,
                context,
                this.getURL(this.url, context, data),
                this.getParam(this.params, context, data),
                function (err, context) {
                    if (err === null) {
                        next(context, data);
                    }

                    done();
                });
}

function getParamArg(url) {
    return url;
}

function getParamFunction(func, context, data) {
    var res = func(context, data.getObject());

    return res;
}

function getURLArg(url) {
    return url;
}

function getURLFunction(func, context, data) {
    var res = func(context, data.getObject());

    if (res.nodeType !== undefined) {
        res = getURLContext(res);
    }

    return res;
}

function getURLContext(context) {
    if (context.getAttribute('href')) {
        return context.getAttribute('href');
    }

    if (context.text !== undefined) {
        return context.text();
    } else if (context.value !== undefined) {
        return context.value();
    }
}

module.exports.get =
module.exports.post = function (url, query) {
    var args  = this.args,
        urlIsFunction   = typeof url === 'function',
        queryIsFunction = typeof query === 'function';

    if (typeof args[3] === 'object' || typeof args[4] === 'object') {
        console.error("GET/POST: `opts` argument deprecated." +
                      "Use `.config` instead.");
    }

    if (typeof args[3] === 'function' || typeof args[4] === 'function') {
        console.error("GET/POST: `callback` argument deprecated." +
                      "Use `.then` instead.");
    }

    if (urlIsFunction === true) {
        this.getURL = getURLFunction;
    } else {
        this.getURL = getURLArg;
    }

    if (queryIsFunction === true) {
        this.getParam = getParamFunction;
    } else {
        this.getParam = getParamArg;
    }

    this.url    = url;
    this.params = query;

    return Get;
};
