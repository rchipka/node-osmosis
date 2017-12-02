/*jslint node: true */
'use strict';

/**
 * Loads multiple pages.
 *
 * The first argument can alternatively be an object representing
 * HTTP GET/POST parameters to modify.
 *
 * If the first argument is an object, numeric values will
 * increment the existing parameter value by that amount.
 *
 * String values are treated as selectors and each corresponding
 * parameter's value will be replaced with the content of the selected node.
 *
 * @function paginate
 * @memberof Command
 * @param {selector} selector - A link or form to the next page.
 * @param {number|Selector|middlewareCallback} [limit] -
    Total number of pages to load.
 * @instance
 */

var form = require('../Form.js');

function Paginate(context, data, next, done) {
    var selector = this.selector,
        limit = this.getLimit(this.limit, context, data),
        document = context.doc(),
        count = document.request.count || 1,
        self = this,
        params = {},
        method, url, param, node = context, name, value;

    next(context, data, count);

    if (limit !== undefined && count > limit) {
        return done();
    }

    method = document.location.method || 'get';
    url    = document.location.href;
    params = {};

    if (selector instanceof Function) {
        var ret = selector(context, data);

        if (typeof ret === 'string') {
            url = document.location.resolve(ret);
        } else {
            params = ret;
        }
    } else if (selector instanceof Object) {
        for (param in selector) {
            value = selector[param];

            if (typeof value !== 'number') {
                params[param] = getContent(context.get(value));
            } else {
                params[param] = (parseFloat(document.request.params[param]) ||
                                 0) +
                                value;
            }
        }
    } else {
        node = document.get(selector);

        if (!node) {
            return done('no results for "' + selector + '" in ' + url);
        } else if (node.nodeName === 'form') {
            url = form.getAction(node);
            method = form.getMethod(node);
            params = form.getParams(node);
        } else if (node.hasAttribute('href')) {
            url = node.getAttribute('href');
        } else {
            name = node.getAttribute('name');

            if (name !== null) {
                name = name.value();
                value = node.getAttribute('value');

                if (value === null) {
                    value = getContent(node);
                }

                params[name] = value;
            } else {
                return done('no URL found in ' + selector);
            }
        }
    }

    self.log('loading page ' + count + (limit ?
                                        '/' + limit :
                                        '') + ' - ' + url);

    self.request(method, node, url, params, function (document) {
                document.request.count = count + 1;
                self.start(document, data);
            });

    done();
}

function getLimitArg(limit) {
    return limit;
}

function getLimitFunction(callback, context, data) {
    var value = callback(context, data.getObject());

    if (value === false) {
        return 0;
    } else if (value === true) {
        return undefined;
    } else {
        return value;
    }
}

function getLimitSelector(selector, context) {
    var node = context.get(selector), value;

    if (!node) {
        return 0;
    }

    value = getContent(node);

    if (!value) {
        return 0;
    }

    value = parseInt(value.replace(/[^0-9\.]+/g, ''));

    return value || 0;
}

function getContent(node) {
    if (node.text !== undefined) {
        return node.text();
    } else if (node.value !== undefined) {
        return node.value();
    }
}

module.exports.paginate = function (selector, limit) {
    this.selector = selector;
    this.limit = limit;

    switch (typeof limit) {
        case 'string':
            this.getLimit = getLimitSelector;
            break;
        case 'function':
            this.getLimit = getLimitFunction;
            break;
        default:
            this.getLimit = getLimitArg;
            break;
    }

    return Paginate;
};
