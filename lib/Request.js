'use strict';

var needle = require('needle'),
    URL    = require('url'),
    libxml = require('libxmljs-dom');

/**
 * Make an HTTP request.
 *
 * @private
 */

function Request(method, url, params, opts, tries, callback) {
    var location = url;
    return needle.request(method,
                          url.href,
                          params,
                          opts,
                          function (err, res, data) {

        if (!(url.params instanceof Object) || url.params === null) {
            url.params = url.query;
        }

        if (err !== null) {
            callback(err.message);
            return;
        }

        if (opts.ignore_http_errors !== true &&
            res                     !== undefined &&
            res.statusCode          >=  400   &&
            res.statusCode          <=  500
        ) {
            // HTTP error
            callback(res.statusCode + ' ' + res.statusMessage);
            return;
        }

        if (method !== 'head' && (!data || data.length === 0)) {
            callback('Data is empty');
            return;
        }

        function next(document) {
            if (opts.parse === false) {
                callback(null, res, document);
                return;
            }

            document = libxml.parseHtml(document,
                { baseUrl: location.href, huge: true });

            if (document === null) {
                callback('Couldn\'t parse response');
                return;
            }

            if (document.errors[0] !== undefined &&
                document.errors[0].code === 4) {
                callback('Document is empty');
                return;
            }

            if (document.root() === null) {
                callback('Document has no root');
                return;
            }

            location.headers    = res.req._headers;
            location.proxy      = opts.proxy;
            location.user_agent = opts.user_agent;

            document.location = location;
            document.request  = location;

            setResponseMeta(document, res, data.length);
            setCookies(document, res.cookies);
            setCookies(document, opts.cookies);

            if (opts.keep_data === true) {
                document.response.data = data;
            }

            callback(null, res, document);
        }

        if (
            opts.process_response !== undefined &&
            typeof opts.process_response === 'function'
        ) {
            if (opts.process_response.length > 2) {
                opts.process_response(data, res, next, callback);
                return;
            }

            next(opts.process_response(data, res));
        } else {
            next(data);
        }

    })
    .on('redirect', function (href) {
        extend(location, URL.parse(URL.resolve(location.href, href)));
    });
}

function setResponseMeta(document, res, size) {
    var response = {
            type: getResponseType(res.headers['content-type']),
            statusCode: res.statusCode,
            statusMessage: res.statusMessage,
            headers: res.headers,
            size: {
                body: size
            }
        };


    if (res.socket !== undefined) {
        response.size.total   = res.socket.bytesRead;
        response.size.headers = res.socket.bytesRead - size;
    }

    document.response = response;
}

function getResponseType(contentType) {
    if (contentType === undefined) {
        return null;
    }

    if (contentType.indexOf('xml') !== -1) {
        return 'xml';
    }

    if (contentType.indexOf('html') !== -1) {
        return 'html';
    }

    return contentType;
}


function setCookies(document, cookies) {
    var key, keys, length;

    if (cookies === undefined) {
        return;
    }

    keys = Object.keys(cookies);
    length = keys.length;

    if (length === 0) {
        return;
    }

    if (document.cookies === undefined) {
        document.cookies = {};
    }

    while (length--) {
        key = keys[length];
        document.cookies[key] = cookies[key];
    }
}

function extend(object, donor) {
    var key, keys = Object.keys(donor), i = keys.length;

    while (i--) {
        key = keys[i];
        object[key] = donor[key];
    }

    return object;
}

module.exports = Request;
