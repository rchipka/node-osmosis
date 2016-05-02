/*jslint node: true */

'use strict';

var Data     = require('./Data.js'),
    URL      = require('url'),
    fs       = require('fs'),
    qs       = require('querystring'),
    formFunctions = require('./form-functions.js'),
    cmdDir   = __dirname + '/commands/';

/**
 * An Osmosis command.
 *
 * @constructor Command
 * @protected
 * @param {object} parent - parent instance
 * @returns Command
 */

function Command(parent) {
    if (Object.getPrototypeOf(parent) === Command.prototype) {
        // parent is a Command
        this.prev = parent;
        Object.defineProperty(this, 'instance', {
            get: Command.prototype.getInstance,
            set: Command.prototype.setInstance
        });
    } else if (parent !== undefined) {
        // `parent` is an Osmosis instance
        this.instance = parent;
        // Call `process.nextTick` so other instances can initialize
        process.nextTick(function () {
            // Attempt to auto-run the instance only IF:
            //  * Not already running
            //  * Not created using `new`
            //  * Not a child instance
            if (parent.started !== true &&
                parent.calledWithNew !== true &&
                parent.parent === undefined) {
                parent.run();
            }
        });
    }

    return this;
}

Command.prototype = {
    isCommand: true,

    /**
     * Change context to the current Document.
     *
     * @property document
     * @see Command.doc
     */

    get document() {
        return this.doc();
    },

    /**
     * Else.
     *
     * @property else
     * @private
     * @see Command.if
     */

    get else() {
         return this.else();
     },

    inherit: function (command) {
        command.instance = this.instance;
        return command;
    },

    /**
      * Change context to the current Window.
      *
      * @property window
      */

    get window() {
        return this.getWindow();
    },

    getInstance: function () {
        return this.prev.instance;
    },

    setInstance: function (val) {
        return (this.prev.instance = val);
    }
};

Command.prototype.lookup = function (key) {
    this.instance.useData = {};
    return this.instance.useData[key];
};

Command.prototype.delayStart = function () {
    var parent = this.prev;

    if (parent === undefined) {
        parent = this.instance;
    }
};

/**
 * Start a Command.
 *
 * @private
 * @function start
 * @param {context} context - HTML/XML context
 * @param {data} data - User defined Data
 * @memberof Command
 */

Command.prototype.start = function (context, data) {
    var self        = this,
        next        = this.next,
        instance    = this.instance,
        callback    = this.cb,
        calledNext  = false,
        window;

    if (context === null) {
        return;
    }

    if (instance.stopped === true) {
        return;
    }

    if (instance.paused  === true) {
        instance.resume(function () {
            self.start(context, data);
        });

        return;
    }

    if (callback === undefined)  {
        if (next === undefined) {
            this.end(context, data);
        } else {
            next.start(context, data);
        }

        return;
    }

    instance.stack.push();

    if (data === undefined) {
        data = (new Data());
    }

    data.ref();
    return callback.call(this, context, data, function (c, d) {
        if (calledNext === true) {
            // If `next` is called more than once,
            // then we need to clone the data
            next.start(c, d.clone().ref());
        } else {
            calledNext = true;
            next.start(c, d);
        }
    }, function (err) {
        data.unref();

        if (calledNext !== true) {
            self.end(context, data);
        }

        if (err !== undefined) {
            self.error(err);
        }

        instance.stack.pop();
    });
};

/**
 * Called when we reach the end of the command chain.
 *
 * @private
 */

Command.prototype.end = function (context, data) {
    var window, parent;

    // We're on the "sentinel node", meaning
    // We've reached the end of the command chain
    if (context !== undefined) {
        if (context.doc === undefined) {
            window = context.window;
        } else if (context.doc().__window !== undefined) {
            window = context.doc().defaultView;
        }

        if (window !== undefined) {
            // close `window` when it reaches the last command
            window.close();
        }

        this.instance.stack.done++;
    }

    if (data !== undefined) {
        parent = data.parent;

        if (parent !== undefined) {
            if (data.isEmpty()) {
                data = data.clone();

                if (context.text !== undefined) {
                    data.setObject(context.text());
                } else if (context.value !== undefined) {
                    data.setObject(context.value());
                }
            }

            parent.merge(data);
            data.unref();
        }
    }
};

/**
 * Get the current options and inherit previous options.
 *
 * @private
 */

Command.prototype.getOpts = function () {

    var proto;

    if (this.opts !== undefined) {
        return this.opts;
    }

    if (this.prev !== undefined) {
        proto = this.prev.getOpts(true);
    } else if (this.instance !== undefined) {
        proto = this.instance.opts;
    }

    this.opts = Object.create(proto);

    if (this.tmp_opts !== undefined) {
        extend(this.opts, this.tmp_opts);
        this.tmp_opts = null;
    }

    return this.opts;
};

/**
 * Internal HTTP request function.
 *
 * @param {string} method - Request method
 * @param {string} url    - URL to load
 * @param {object} params - GET query parameters or POST data
 * @param {function} callback - Callback function
 * @private
 */

Command.prototype.request = function (method, context, url, params, callback) {
    var self     = this,
        length   = callback.length,
        instance = self.instance,
        opts     = Object.create(this.config()),
        document, key, proxies;

    if (!url || url.length === 0) {
        callback("Invalid URL");
        return;
    }

    if (length === 3) {
        opts.parse = false;
    }

    if (context !== undefined) {
        document = context.doc();
        url = document.location.resolve(url);

        if (opts.headers === undefined) {
            opts.headers = {};
        }

        if (opts.follow_set_referer !== false) {
            opts.headers.referer = document.location.href;
        }

        opts.cookies = document.cookies;

        if (method === 'post') {
            // Check the enctype if submitting a form
            if (formFunctions.isMultipart(context)) {
                opts.multipart = true;
            }
        }
    } else {
        if (url.substr(0, 1) === '//') {
            url = 'http:' + url;
        } else if (url.substr(0, 4) !== 'http') {
            url = 'http://' + url;
        }
    }

    url = URL.parse(url, true);
    url.method = method;
    url.params = params;

    if (method === 'get') {
        for (key in params) {
            url.query[key] = params[key];
        }

        url.params = url.query;
        url.search = qs.stringify(url.query);
        url.href   = URL.format(url);
        params = undefined;
    }

    if (Array.isArray(opts.proxy)) {
        opts.proxies = opts.proxy;
    }

    if (opts.proxies !== undefined) {
        proxies = opts.proxies;

        if (proxies.index === undefined || ++proxies.index >= proxies.length) {
            proxies.index = 0;
        }

        opts.proxy = proxies[proxies.index];
    }

    instance.queueRequest(url, opts,
    function (err, res, document, last_try) {
        if (err !== null) {
            // If we have an error and it's not just a 404
            // then one of the proxies must have failed

            if (opts.proxies !== undefined &&
                (res === undefined || res.statusCode !== 404)) {

                if (opts.error === true) {
                    self.error('proxy ' + (proxies.index + 1) + '/' +
                                        proxies.length +
                                        ' failed (' + opts.proxy + ')');
                }

                // remove the failing proxy
                if (proxies.length > 1) {
                    opts.proxies.splice(proxies.index, 1);
                    opts.proxy = proxies[proxies.index];
                }

            }

            self.error((self.name !== method ?
                        '[' + method + '] ' :
                        '') + (url.href) + ' - ' + err);

            if (last_try === true) {
                // Call callback after **final** request only
                if (length === 2) {
                    callback(err, document);
                } else if (length === 3) {
                    callback(err, res, document);
                }
            }
        } else {
            self.log('loaded [' + method + '] ' + url.href + ' ' +
                (params ?
                JSON.stringify(params) :
                '') +
                (opts.proxy ?
                ' via ' + opts.proxy :
                '')
            );

            if (length === 1) {
                callback(document);
            } else if (length === 2) {
                callback(null, document);
            } else {
                callback(null, res, document);
            }

            document = null;
        }

        instance.stack.pop();
        // The stack count was incremented before the request,
        // so we decrement it after the request is completed.
    });

    return this;
};

/**
 * Call a callback when log, error, or debug messages are received.
 *
 * @name log/error/debug
 * @memberof Osmosis;
 * @param {function} callback - Callback
 */

['log', 'error', 'debug'].forEach(function (name) {
    Command.prototype[name] = function (msg, prefixed) {
        if (msg instanceof Function) {
            this[name] = msg;
            this.instance.config(name, true);
        } else if (this.next !== undefined) {
            if (prefixed === undefined) {
                this.next[name]('(' + this.name + ') ' + msg, '');
            } else {
                this.next[name](msg, '');
            }
        } else if (this.instance.parent !== undefined) {
            this.instance.parent[name](msg, true);
        }

        return this;
    };
});

function extend(object, donor, replace) {
    var key, keys = Object.keys(donor),
    i = keys.length;

    while (i--) {
        key = keys[i];

        if (replace === true && object[key] === undefined) {
            object[key] = donor[key];
        }
    }

    return object;
}

function contextCommand(name, func) {
    Command.prototype[name] = (function () {
        var length   = arguments.length,
            self, i, args;

        if (this.name === undefined) {
            self = this;
        } else {
            self = new Command(this);
        }

        self.name = name;

        args = new Array(length);

        for (i = 0; i < length && arguments[i] !== undefined; i++) {
            args[i] = arguments[i];

            if (typeof args[i] === 'object') {
                args[i] = this.findCommandArg(args[i]);
            }
        }

        self.args = args;

        if (func.length === 4) {
            self.cb = func;
        } else {
            self.cb = func.apply(self, self.args);
        }

        self.next = new Command(self);

        return self.next;
    });
}

Command.prototype.findCommandArg = function (obj) {
    var keys, key, length, i = 0;

    if (obj instanceof Command) {
        obj.instance.setParent(this);
        return obj.instance.command;
    }

    keys    = Object.keys(obj);
    length  = keys.length;

    for (; i < length; i++) {
        key = keys[i];
        switch (typeof obj[key]) {
            case 'object':
                obj[key] = this.findCommandArg(obj[key]);
                break;
            case 'function':
                obj[key] = this.findCommandArg(this.then(obj[key]));
        }
    }

    return obj;
};

fs.readdirSync(cmdDir).forEach(function (file) {
    var command = require(cmdDir + file);

    if (typeof command === 'object') {
        Object.keys(command).forEach(function (name) {
            contextCommand(name, command[name]);
        });
    } else {
        Command.prototype[file.substr(0, file.length - 3)] = command;
    }
});

module.exports = Command;
