'use strict';

var Data     = require('./Data.js'),
    URL      = require('url'),
    fs       = require('fs'),
    qs       = require('querystring'),
    formFunctions = require('./Form.js'),
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
    var self = this;

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
            if (parent.calledWithNew !== true &&
                parent.parent === undefined) {
                process.nextTick(function () {
                    // Run on nextTick to allow any
                    // runtimeCommands to finish first
                    parent.run();
                });
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
     * @see {@link Command.doc}
     */

    get document() {
        return this.doc();
    },

    /**
     * Else.
     *
     * @property else
     * @private
     * @see {@link Command.if}
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

Command.prototype.run = function (context, data) {
    return this.instance.run(context, data);
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

    instance.queue.push();

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

        instance.queue.pop();
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

        this.instance.queue.done++;
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
        proto = this.prev.getOpts();
    } else if (this.instance !== undefined) {
        proto = this.instance.opts;
    }

    this.opts = Object.create(proto);

    return this.opts;
};


/**
 * Set an option for the current command.
 *
 * Clones inherited object values.
 *
 * @private
 */

Command.prototype.setOpt = function (name, value) {
    var opts = this.getOpts();

    if (value !== null &&
        value instanceof Object &&
        opts[name] !== null &&
        opts[name] instanceof Object) {
        opts[name] = extend(value, opts[name]);
    } else {
        opts[name] = value;
    }

    return opts;
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

Command.prototype.request = function (method, context, href, params, callback) {
    var self     = this,
        length   = callback.length,
        instance = self.instance,
        opts     = Object.create(this.getOpts()),
        url, document, key, proxies;

    if (!href || href.length === 0) {
        callback("Invalid URL");
        return;
    }

    if (length === 3) {
        opts.parse = false;
    }

    if (context !== undefined) {
        document = context.doc();

        url = URL.parse(document.location.resolve(href), true);

        if (opts.follow_set_referer !== false) {
            if (opts.headers === undefined) {
                opts.headers = {};
            }

            opts.headers.referer = document.location.href;
        }

        if (opts.cookies !== undefined) {
            if (document.cookies === undefined) {
                document.cookies = {};
            }

            opts.cookies = extend(document.cookies, opts.cookies);
        } else {
            opts.cookies = document.cookies;
        }

        if (method === 'post') {
            // Check the enctype if submitting a form
            if (formFunctions.isMultipart(context)) {
                opts.multipart = true;
            }
        }
    } else if (href.substr(0, 1) === '//') {
        url = URL.parse('http:' + href, true);
    } else if (href.substr(0, 4) !== 'http') {
        url = URL.parse('http://' + href, true);
    } else {
        url = URL.parse(href, true);
    }

    url.method = method;
    url.params = params;

    if (method === 'get') {
        for (key in params) {
            url.query[key] = params[key];
        }

        url.params = url.query;
        url.search = qs.stringify(url.query);
        url.href   = URL.format(url);
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
    function (err, res, document) {
        if (err !== null) {
            self.error((self.name !== method ?
                        '[' + method + '] ' :
                        '') + (url.href) + ' - ' + err);

            if (length === 2) {
                callback(err, document);
            } else if (length === 3) {
                callback(err, res, document);
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
        }
    });
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

function extend(object, donor) {
    var key, keys = Object.keys(donor),
    i = keys.length;

    if (object === undefined) {
        object = {};
    }

    while (i--) {
        key = keys[i];
        object[key] = donor[key];
    }

    return object;
}

function runtimeCommand(name, func) {
    Command.prototype[name] = (function () {
        var length   = arguments.length,
            self = this, args, i;

        if (length === 0) {
            // Allow `.config()`, etc. to get configuration
            // options during command chain compile time
            return func.call(self);
        }

        args = new Array(length);

        for (i = 0; i < length && arguments[i] !== undefined; i++) {
            args[i] = arguments[i];
        }

        process.nextTick(function () {
            if (self.next !== undefined) {
                // We're NOT on the last command, so we call `func` in the
                // context of the PRECEEDING command
                func.apply(self.prev, args);
            } else {
                // We're on the last command, so we call `func` in the
                // context of the FIRST command
                func.apply(self.instance.command, args);
            }
        });

        return self;
    });
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
                if (obj[key] !== null) {
                    obj[key] = this.findCommandArg(obj[key]);
                }

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
        runtimeCommand(file.substr(0, file.length - 3), command);
    }
});

module.exports = Command;
