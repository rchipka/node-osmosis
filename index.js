'use strict';

var Command = require('./lib/Command.js'),
    Queue   = require('./lib/Queue.js'),
    request = require('./lib/Request.js'),
    libxml  = require('libxmljs-dom'),
    instanceId      = 0,
    memoryUsage     = 0,
    cachedSelectors = {},
    toMB    = function (size, num) {
        return (size / 1024 / 1024).toFixed(num || 2) + 'Mb';
    },

    extend  = function (object, donor) {
        var key, keys = Object.keys(donor),
                    i = keys.length;

        while (i--) {
            key = keys[i];
            object[key] = donor[key];
        }

        return object;
    };

/**
 *
 * Unless called with `new`, Osmosis will start automatically.
 * To start an instance created with `new`, use {@link Osmosis.run}.
 *
 * @constructor Osmosis
 *
 * @param {(string|contextCallback)} url - A URL
 * @param {object} [params] - GET query parameters
 * @returns Command
 * @see {@link Command.run}
 *
 * @example {@lang javascript}
 *
 * // These instances start immediately
 * osmosis.get('http://example.com');
 * osmosis('http://example.com');
 *
 * // These instances need started
 * instance = new osmosis.get('http://example.com');
 * instance.run();
 *
 * instance = new osmosis('http://example.com');
 * instance.run();
 */

function Osmosis(url, params) {
    if (url !== undefined) {
        if (this instanceof Osmosis) {
            return new Osmosis.get(url, params);
        }

        return Osmosis.get(url, params);
    }

    this.queue   = new Queue(this);
    this.command = new Command(this);
    this.id      = ++instanceId;
}


/**
 * @name options
 *
 * Osmosis and {@link https://github.com/tomas/needle|needle} options.
 *
 * @property {string} accept             - HTTP Accept header
 * @property {bool}   compressed         - Compress HTTP requests
 * @property {number} concurrency        - Number of simultaneous HTTP requests
 * @property {bool}   decode_response    - Decode compressed HTTP responses
 * @property {number} follow             - Number of redirects to follow
 * @property {bool}   follow_set_cookies - Set cookies for redirects
 * @property {bool}   follow_set_referer - Set referer header for redirects
 * @property {bool}   keep_data          - Keep raw HTTP data in
                                           context.response.data
 * @property {bool}   timeout            - HTTP request timeout
 * @property {bool}   tries              - HTTP request attempts
 * @property {bool}   user_agent         - HTTP user agent
 * @memberof Osmosis
 * @instance
 * @default
 */

Osmosis.prototype.opts = {
    accept:                 'text/html,application/xhtml+xml,' +
                            'application/xml;q=0.9,*/*;q=0.8',
    compressed:             true,
    concurrency:            5,
    decode_response:        true,
    follow:                 3,
    follow_set_cookies:     true,
    follow_set_referer:     true,
    keep_data:              false,
    parse_cookies:          true, // Parse "Set-Cookie" header
    parse_response:         false,
    rejectUnauthorized:     false,
    statsThreshold:         25,
    timeout:                30 * 1000,
    tries:                  3,
    user_agent:             'Mozilla/5.0 (Windows NT x.y; rv:10.0) ' +
                            'Gecko/20100101 Firefox/10.0'
};

/**
 * Configure global Osmosis options.
 *
 * @function config
 * @memberof Osmosis
 * @param {string|object} option - A string `key` or an object of
 * { key: value } pairs.
 * @param {any} [value] - A value for the `key`
 * @instance
 * @see {@link Command.config}
 * @see {@link Osmosis.options}
 */

Osmosis.config =
Osmosis.prototype.config = function (option, value) {
    var hasPrototype = (this.prototype !== undefined),
        opts, key;

    if (hasPrototype === true) {
        opts = this.prototype.opts;
    } else if (this.opts === undefined) {
        opts = this.opts = {};
    } else {
        opts = this.opts;
    }

    if (option === undefined) {
        return opts;
    }

    if (value !== undefined) {
        opts[option] = value;
    } else if (key !== undefined) {
        for (key in option) {
            opts[key] = option[key];
        }
    }
};

/**
 * Run (or re-run) an Osmosis instance.
 *g
 * If you frequently use the same Osmosis instance
 * (such as in an Express server), it's much more efficient to
 * initialize the instance once and repeatedly use `run` as needed.
 *
 * @borrows Command.run
 * @see {@link Command.run}
 */
Osmosis.prototype.run = function () {
    var self = this;

    process.nextTick(function () {
        self.started  = true;
        self.command.start();
    });
};

/**
 * Make an HTTP request.
 *
 * @private
 */

Osmosis.prototype.request = function (url, opts, callback, tries) {
    var self = this,
        href   = url.href,
        method = url.method,
        params = url.params;

    this.requests++;
    this.queue.requests++;
    this.queue.push();
    
    if (typeof opts.user_agent === 'function') {
        opts.user_agent = opts.user_agent();
    }

    request(url.method,
            url,
            url.params,
            opts,
            tries,
            function (err, res, data) {
                var proxies = opts.proxies;

                self.queue.requests--;

                if ((res === undefined || res.statusCode !== 404) &&
                    proxies !== undefined) {
                    self.command.error('proxy ' + (proxies.index + 1) +
                                        '/' + proxies.length +
                                        ' failed (' + opts.proxy + ')');

                    // remove the failing proxy
                    if (proxies.length > 1) {
                        opts.proxies.splice(proxies.index, 1);
                        opts.proxy = proxies[proxies.index];
                    }
                }

                if (err !== null && ++tries < opts.tries) {
                    self.queueRequest(url, opts, callback, tries);

                    if (self.opts.log === true) {
                        self.command.error(err + ', retrying ' +
                                        url.href + ' (' +
                                        (tries + 1) + '/' +
                                        opts.tries + ')');
                    }
                } else {
                    callback(err, res, data);
                }

                self.dequeueRequest();
                self.queue.pop();
            })
            .on('redirect', function (new_url) {
                if (self.opts.log === true) {
                    self.command.log('[redirect] ' +
                                     href + ' -> ' + new_url);
                }
            });
};

/**
 * Add a request to the queue.
 *
 * @param {string} method - HTTP request method
 * @param {string} url - The URL to request
 * @param {object} params - HTTP GET/POST Data
 * @param {object} opts - HTTP request options
 * @param {function} callback - Function to call when done
 * @private
 */

Osmosis.prototype.queueRequest = function (url,
                                           opts,
                                           callback,
                                           tries) {
    if (tries === undefined) {
        tries = 0;
    }

    if (this.queue.requests < this.opts.concurrency) {
        this.request(url, opts, callback, tries);
    } else {
        this.queue.enqueue([url, opts, callback, tries]);
    }
};

Osmosis.prototype.dequeueRequest = function () {
    var arr, length = this.queue.length;

    if (length === 0 || this.queue.requests >= this.opts.concurrency) {
        return;
    }

    arr = this.queue.dequeue();

    this.request(arr[0], arr[1], arr[2], arr[3]);
};

/**
 * Parse XML/HTML data.
 *
 * @param {string|buffer} data - The data to parse
 * @param {object} opts - libxmljs parse options
 * @private
 * @see Command.parse
 */

Osmosis.prototype.parse = function (data, opts) {
    /*
     * We only use `parseHtml` because we need to
     * avoid libxml namespaces when searching the document.
     */

    var document = libxml.parseHtml(data, opts);

    if (opts !== undefined && opts.baseUrl !== undefined) {
        document.location = opts.baseUrl;
    }

    return document;
};

/**
 * Print Node.JS process statistics via {@link Command.debug}.
 *
 * @private
 */

Osmosis.prototype.resources = function () {
    var mem         = process.memoryUsage(),
        memDiff     = toMB(mem.rss - memoryUsage),
        libxml_mem  = libxml.memoryUsage(),
        nodes       = libxml.nodeCount();

    if (this.opts.debug !== true) {
        this.resources = null;

        return;
    }

    if (nodes >= 1000) {
        nodes = (nodes / 1000).toFixed(0) + 'k';
    }

    if (memDiff.charAt(0) !== '-') {
        memDiff = '+' + memDiff;
    }

    this.command.debug(
                'stack: '    + this.queue.count + ', ' +

                'requests: ' + this.requests +
                             ' (' + this.queue.requests + ' queued), ' +

                'RAM: '      + toMB(mem.rss) + ' (' + memDiff + '), ' +

                'libxml: '   + ((libxml_mem / mem.rss) * 100).toFixed(1) +
                             '% (' + nodes + ' nodes), ' +

                'heap: '     + ((mem.heapUsed / mem.heapTotal) * 100)
                             .toFixed(0) + '% of ' +
                             toMB(mem.heapTotal)
            );

    memoryUsage = mem.rss;
};

/**
 * Set the parent instance for this instance.
 *
 * Inherit the parent's queue and options.
 *
 * @private
 * @param {Command} parent - The parent Command.
 */

Osmosis.prototype.setParent = function (parent) {
    this.parent = parent;
    this.queue  = parent.instance.queue;
    this.opts   = parent.instance.opts;
};

/**
 * Resume the current instance.
 *
 * @param {function} callback - A function to call when resuming
 * @borrows Command.resume
 * @private
 */

Osmosis.prototype.resume = function (arg) {
    var length, i;

    if (typeof arg === 'function') {
        if (this.resumeQueue === undefined) {
            this.resumeQueue = [];
        }

        this.resumeQueue.push(arg);
    } else {
        length = this.resumeQueue.length;

        for (i = 0; i < length; ++i) {
            this.resumeQueue[i]();
        }

        this.dequeueRequest();
    }
};

Osmosis.prototype.requests = 0;
Osmosis.prototype.paused = false;
Osmosis.prototype.stopped = false;
Osmosis.prototype.inspect = function () {
    return 'Osmosis:' + this.id;
};

// Allow use of commands without creating a new instance:

Object.keys(Command.prototype).forEach(function (name) {
    if (Osmosis[name] !== undefined) {
        return;
    }

    Osmosis[name] = function StartingFunction(arg1, arg2, arg3) {
        var instance = new Osmosis(),
            command  = instance.command;

        instance.calledWithNew = (this instanceof StartingFunction);

        return command[name](arg1, arg2, arg3);
    };
});

// libxmljs overrides:

libxml.Document.prototype.findXPath = libxml.Document.prototype.find;
libxml.Element.prototype.findXPath  = libxml.Element.prototype.find;

libxml.Document.prototype.find = function (selector, cache) {
    return this.root().find(selector, cache);
};

libxml.Element.prototype.find = function (selector) {
    if (selector.charAt(1) === '/' ||
        selector.charAt(0) === '/' ||
        selector.charAt(0) === '(') {
        return this.findXPath(selector);
    } else if (cachedSelectors[selector] === undefined) {
        cachedSelectors[selector] = libxml.css2xpath(selector);
    }

    return this.findXPath(cachedSelectors[selector]) || [];
};

/**
 * @typedef {object} context
 *
 * An XML/HTML DOM object represting a Document, Element, Attribute
 * or other Node.
 */

/**
 * @typedef {object} data
 *
 * An object containing values set by `.set`
 * @see {@link Command.set}
 */

/**
 * @typedef {string} Selector
 *
 * A CSS/XPath selector
 * @see {@link https://github.com/css2xpath/css2xpath|Selectors}
 */

/**
 * A callback function that returns the desired value.
 *
 * @callback middlewareCallback
 * @param {context} context - The current XML/HTML context node.
 * @param {data} data - The current data object.
 */

Osmosis.libxmljs = libxml;

module.exports = Osmosis;
