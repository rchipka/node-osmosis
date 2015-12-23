'use strict';
var URL = require('url');
var fs = require('fs');
var jQuery;

var Promise = {

    click: function(context, data, next, done) {
        var selector = this.args[0];
        var opts     = this.args[1];

        var nodes = context.find(selector);
        if (nodes.length === 0) {
            if (this.config().debug === true)
            this.debug('no results for "'+selector+'"'+getLocation(context));
            return done();
        }
        var self = this;
        var window = context.doc().defaultView;
        window.addEventListener('done', function(ev) {
            nodes.forEach(function(node, index) {
                self.debug("clicking "+node.nodeName)
                node.dispatchEvent('click');
                window.addEventListener('done', function(ev) {
                    if (index === nodes.length-1) {
                        next(context, data);
                        done();
                    }
                })
            })
        });
    },

    contains: function(context, data, next) {
        var str = this.args[0];
        if (getContent(context).indexOf(str) !== -1)
            next(context, data);
        else
            this.debug('"'+str+'" not found in '+getLocation(context))
    },

    data: function(context, data, next) {
        var cb = this.args[0];

        if (typeof cb === 'function') {
            cb.call(this, data.obj);
            this.next.start(context, data);
        } else if (cb === null) {
            this.next.start(context, {});
        } else {
            this.next.start(context, extend(data.obj, cb, true));
        }
    },

    delay: function(context, data, next, done) {
        var wait = this.args[0];
        if (this.waitTime === undefined)
            this.waitTime = wait;
        var self = this;
        setTimeout(function() {
            self.waitTime -= wait;
            next(context, data);
            done();
        }, this.waitTime);
        this.waitTime += wait;
    },

    do: function(context, data, next, done) {
        var args = this.args;
        var doNext = function(i) {
            data.done = function() {
                data.obj = this.obj;
                if (data.refs > 0) return;
                if (++i < args.length) {
                    doNext(++i);
                }else{
                    next(context, data);
                    done()
                }
            }
            args[i].start(context, data)
        }
        doNext(0);
    },

    doc: function(context, data, next) {
        this.next.start(context.document||context.doc(), data);
    },

    dom: function(context, data, next) {
        var callback = this.args[0];
        var opts     = this.args[1];

        context.doc().dom(this, opts, function(window) {
            window.stack.done = function() {
                callback(window, data, function(context, data) {
                    if (context.window !== undefined)
                        context = context.document;
                    next(context, data)
                });
            }
        })
    },

    failure: function(context, data, next) {
        var selector = this.args[0];
        if (context.find(selector).length === 0)
            next(context, data);
    },

    filter: function(context, data, next) {
        var selector = this.args[0];
        if (context.find(selector).length !== 0)
            next(context, data);
    },

    find: function(context, data, next, done) {
        var selector = this.args[0];

        if (this.name[0] === 's')
            var res = context.find(selector);
        else
            var res = context.doc().find(selector);

        if (res.length < 1) {
            this.error('no results for "' + selector + '"' + getLocation(context.doc()));
            done();
            return;
        }

        var length = res.length;

        if (this.config().log === true)
            this.log('found ' + length + ' results for "' + selector + '"' + getLocation(context.doc()))

        for (var i = 0; i < length; i++) {
            var node = res[i];
            node.last = (length - 1 === i);
            node.index = i;
            next(node, data);
        }
        done();
    },

    follow: function(context, data, next, done) {
        var selector = this.args[0];
        var self = this;
        var res = context.find(selector);
        var length = res.length;
        var doc = context.doc();

        if (res === undefined || length === 0) {
            this.debug('no results for "' + selector + '"' + getLocation(context));
            done(context, data);
            return;
        } else {
            if (this.config().follow_set_referer !== false)
                var opts = { headers: { referer: doc.request.url } };
            var queue = 0;
            for (var i = 0; i < length; i++) {
                var node = res[i];
                if (selector.indexOf('@') !== -1)
                    var val = node.value()
                else
                    var val = getURL(node);
                if (val !== null) {
                    var url = URL.resolve(doc.request.url, val);
                    if (!url) return;
                    queue++;
                    self.log("url: " + url)
                    self.request('get', url, undefined, function(document) {
                        next(document, data);
                        if (--queue === 0)
                            done();
                    }, opts)
                }
            }
            res = null;
            if (queue === 0)
                done();
        }
        doc     = null;
        res     = null;
        context = null;
        self    = null;
    },

    get: function(context, data, next, done) {
        var self = this;
        var url = this.args[0];
        var params = this.args[1];
        var opts = this.args[2];
        var callback = this.args[3];
        if (typeof url === 'function') {
            url = url(context, data.obj);
        }
        if (url === undefined) {
            this.error('no URL found');
            return;
        }
        if (context !== undefined)
            url = URL.resolve(context.doc().request.url, url);
        if (callback !== undefined) {
            var cb = function(err, c) {
                callback.call(self, c, data, function(nc, nd) {
                    next(nc || c, nd || data)
                });
                done();
            }
        } else {
            var cb = function(err, c) {
                next(c, data)
                done()
            };
        }
        this.request(this.name, url, params, cb, opts);
    },

    login: function(context, data, next) {
        var user = this.args[0];
        var pass = this.args[1];
        var success = this.args[2];
        var fail = this.args[3];
        var params = {};
        var form = context.get('form:has(input[type="password"])')

        if (form === null) {
            this.error('No login form found');
            return;
        }

        var userInput = form.get('input[(not(@type) or @type="text") and @name]:before(input[type="password"]):last');

        if (!userInput) {
            this.error('No user field found');
            return;
        }

        var passInput = userInput.get('following::input[type="password"]');

        if (!passInput) {
            this.error('No password field found');
            return;
        }

        params[userInput.attr('name')] = user;
        params[passInput.attr('name')] = pass;

        /*
         * set any other input values
         */
        var nodes = form.find('input');
        for (var i = nodes.length; i--;) {
            var input = nodes[i];
            var name = input.attr('name');
            if (params[name] !== undefined) return;
            params[name] = input.attr('value');
        }

        var url = URL.resolve(context.doc().request.url, form.attr('action') || context.doc().request.url);
        var method = (form.attr('method') || 'get').toLowerCase();
        this.debug(method + ' ' + url + ' ' + JSON.stringify(params));
        var self = this;
        this.request(method, url, params, function(c) {
            if (typeof fail === 'string') {
                if (c.find(fail).length !== 0) {
                    self.error('failed - found "' + fail + '"');
                    return;
                }
            }
            if (typeof success === 'string') {
                if (c.find(success).length === 0) {
                    self.error('failed - "' + success + '" not found');
                    return;
                }
            }
            next(c, data);
        });
    },

    match: function(context, data, next) {
        var selector = this.args[0];
        var regexp   = this.args[1];
        var text;

        if (selector !== undefined)
            text = getContent(context.get(selector))
        else
            text = getContent(context);

        if (text.match(regexp) !== null)
            next(context, data);
    },

    page: function(context, data, next, done) {
        var selector = this.args[0];
        var limit = this.args[1] || null;
        var doc = context.doc();
        var count = doc.request.count || 1;
        next(context, data);
        done();

        if (typeof limit === 'string') {
            limit = getContent(doc.get(limit));
            if (limit === null) {
                this.error('no results for limit selector ' + selector);
                return;
            }
            limit = parseInt(limit.replace(/[^0-9]+/g, '')) - 1;
        } else if (typeof limit === 'function') {
            if (limit(context, data) === false) {
                return;
            } else
                limit = null;
        }
        if (limit !== null && count > limit)
            return;

        var method = doc.request.method;
        var url = doc.request.url;
        var params = {};

        if (typeof selector === 'string') {
            var node = doc.get(selector);
            if (!node) {
                if (this.config().error === true)
                    this.error('no results for "' + selector + '" in ' + url);
                return;
            } else if (node.nodeName === 'form') {
                var formData = formQueryParams(node);
                url = formData.action;
                method = formData.method;
                params = formData.params;
            } else {
                var tmp = getURL(node);
                if (!tmp) {
                    var name = node.attr('name');
                    if (name !== null) {
                        var params = {};
                        name = name.value();
                        var value = node.attr('value');
                        if (value === null)
                            value = getContent(node);
                        params[name] = value;
                    } else {
                        this.error('no URL found in ' + selector);
                        return;
                    }
                }
                url = tmp;
            }
        } else {
            for (var param in selector) {
                var increment = undefined;
                var val = selector[param];
                if (typeof val === 'number') {
                    increment = val;
                } else {
                    if (Array.isArray(val)) {
                        increment = val[1];
                        val = val[0];
                    }
                    params[param] = getContent(context.get(val));
                }
                if (increment !== undefined) {
                    params[param] = (parseFloat(doc.request.params[param]) || 0) + increment;
                }
            }
        }
        url = URL.resolve(doc.request.url, url)
        if (this.config().follow_set_referer !== false)
            var opts = { headers: { referer: doc.request.url } };
        this.log('loading page ' + count + (limit? '/' + limit:'') + ' - ' + url);
        var self = this;
        this.request(method, url, params, function(c) {
            c.request.count = count + 1;
            self.start(c, data);
        }, opts)
    },

    parse: function(context, data, next) {
        var doc = this.instance.parse(this.args[0]);
        var url = this.args[1];
        if (url !== undefined) {
            url = URL.parse(url, true);
            doc.request = {
                method: 'get',
                url: url.format(),
                params: url.query,
                query: url.query,
                headers: {},
            }
        }
        next(doc, data);
    },

    set: function(context, data, next) {
        var self = this;
        var args = this.args;
        var keys = this.keys;

        var i = 0;
        var loopObject = function() {
            if (i === keys.length) {
                return next(context, data)
            }
            var key = keys[i++];
            var val = args[key];
            var type = typeof val;
            if (type === 'object' && val !== null) {
                if (val.isNestedPromise === true) {
                    if (val.instance === undefined)
                        val.instance = self.instance;
                    val.start(context, data.next({}, key, function() {
                        if (data.refs > 0) return;
                        loopObject()
                    }));
                } else if (Array.isArray(val)) {
                    if (val.length === 0)
                        return loopObject();
                    if (data.obj[key] === undefined) {
                        data.obj[key] = [];
                    }
                    var loopArray = function(arr, d, i) {
                        if (i === arr.length)
                            return loopObject();
                        var v = arr[i];
                        if (typeof v === 'string') {
                            var nodes = context.find(v);
                            var length = nodes.length;
                            for (var n = 0; n < length; n++) {
                                d.push(getContent(nodes[n]));
                            }
                            nodes = null;
                        } else if (v.isNestedPromise) {
                            if (v.instance === undefined)
                                v.instance = self.instance;
                            return v.start(context, data.next({}, key, function() {
                                if (data.refs > 0) return;
                                loopArray(arr, d, i+1)
                            }));
                        } else if (Array.isArray(v) && v.length > 0) {
                            // TODO: Nested array
                        }
                        loopArray(arr, d, i+1);
                    }
                    loopArray(val, data.obj[key], 0);
                }
            }else{
                if (val === null) {
                    data.obj[key] = getContent(context);
                } else if (type === 'function') {
                    data.obj[key] = val(context);
                } else {
                    var el = context.get(val);
                    if (el !== null)
                        data.obj[key] = getContent(el);
                    el = null;
                }
                loopObject();
            }
        }
        loopObject();
        context = null;
    },

    submit: function(context, data, next) {
        var selector = this.args[0];

        var form = context.get(selector);
        if (form === null) {
            this.error(selector + ' not found');
            this.next.start(null);
            return;
        }
        var formData = formQueryParams(form);
        var url    = formData.action;
        var method = formData.method;
        var params = formData.params;

        if (this.args[1] !== undefined)
            extend(params, this.args[1]);

        if (this.config().debug === true)
            this.debug(method + ' ' + url + ' ' + JSON.stringify(params));
        this.request(method, url, params, function(c) {
            next(c, data);
        });
        context = null;
    },

    then: function(context, data, next, done) {
        var cb   = this.args[0];
        var self = this;
        if (this.useDocument !== undefined) {
            context = context.document||context.doc();
        }else if (this.useWindow !== undefined) {
            var window = context.window||context.doc().defaultView;
            if (this.usejQuery !== undefined) {
                if (window.jQuery === undefined) {
                    /*
                    if (jQuery === undefined)
                        jQuery = fs.readFileSync('./lib/jquery.js');
                    context.exec(jQuery);
                    */
                }else
                    window = context.jQuery;
            }else{
                context = window;
            }
        }
        //try {
            if (cb.length === 4) {
                cb.call(self, context, data.obj, function(c, d) {
                    data.obj = d;
                    next(c, data)
                }, done)
            }else if (cb.length === 3) {
                cb.call(self, context, data.obj, function(c, d) {
                    data.obj = d;
                    next(c, data)
                    done();
                });
            }else{
                cb.call(self, context, data.obj);
                next(context, data);
                done();
            }
        /*} catch (err) {
            this.error(err.stack);
            done();
        }*/
    },

    trigger: function(context, data, next, done) {
    },

    getWindow: function(context, data, next) {
        this.next.start(context.window||context.doc().defaultView, data);
    },
}
Promise.paginate = Promise.page;
Promise.post = Promise.get;
Promise.select = Promise.find;
Promise.fail = Promise.failure;
Promise.success = Promise.filter;

/*
 * Pre-process arguments for speed
 *
 */

Promise.do.preloader = function(args) {
    var self = this;
    var length = args.length;
    for (var i = 0; i < length; i++) {
        var obj = args[i];
        obj.isNestedPromise = true;
        obj.cb = obj.setChildData;
        obj.next = this;
        while (obj.prev != undefined) {
            obj = obj.prev;
            obj.isNestedPromise = true;
        }
        obj.isNestedPromise = true;
        obj.depth = 1;
        obj.prev = this;
        args[i] = obj;
    }
    return args;
}

Promise.delay.preloader = function(args) {
    args[0] = args[0]*1000;
    return args;
}

Promise.find.preloader = function(args) {
    if (Array.isArray(args[0])) {
        args[0] = args[0].join(', ');
    }
    return args;
}

Promise.follow.preloader = function(args) {
   if (Array.isArray(args[0])) {
       args[0] = args[0].join(', ');
   }
   if (typeof args[1] === 'function') {
       args[2] = args[1];
       args[1] = true;
   }else if (args[1] === undefined) {
       args[1] = true;
   }
   return args;
}

Promise.get.preloader,
Promise.post.preloader = function(args) {
    if (typeof args[0] === 'string' && isTokenizedString(args[0])) {
        args[0] = parseTokenizedString(args[0]);
    }
    for (var i = 1; i < 3; i++) {
        if (typeof args[i] === 'function') {
            args[3] = args[i];
            args[i] = null;
        }
    }
    return args;
}

Promise.match.preloader = function(args) {
    if (typeof args[0] !== 'string') {
        args[1] = args[0];
        args[0] = undefined;
    }
    return args;
}

Promise.set.preloader = function(args) {
    var self = this;
    var key = args[0];
    var val = args[1];
    var obj = {};

    /*
     * set("key", "val") => set({ "key" : "val" })
     */
    if (typeof key === 'string') {
        obj[key] = val || null;
    } else if (typeof key === 'object') {
        obj = key;
    }

    Object.keys(obj).forEach(function(key) {
        var val = obj[key];
        if (val === null) return;

        var type = typeof val;
        if (type === 'string') {
            if (key.substr(key.length - 2, 2) === '[]' || val.substr(val.length - 2, 2) === '[]') {
                delete obj[key];
                obj[key.replace('[]', '')] = [val.replace('[]', '')];
            }
            val = val.trim();
            if (val.match(/:(html|source)$/)) {
                obj[key] = setInnerHTML(val.replace(/:(html|source)$/, ''))
            }
        }

        if (Array.isArray(val)) {
            obj[key] = Promise.set.preloader.call(self, [val]);
        } else if (type === 'object') {
            if (val.isPromise === undefined) {
                var p1 = self.new();
                var val = p1.set.call(p1, val)
            }
            /*
             * If `val` is a Promise
             *
             * `val` is the last returned promise from the Osmosis instance,
             * so we'll loop through it backwards and update the depths
             * to be greater than the current `set` depth.
             *
             */
            var promise = val;
            promise.cb = self.setChildData;
            promise.isNestedPromise = true;
            promise.parent = self;
            promise.next = self;
            var lastPromise = promise;
            var hasSet = false;

            for (var i = promise.depth; i--;) {
                if (promise.name === 'set')
                    hasSet = true;
                promise.depth = i + 2;
                promise.parent = self;
                promise.isNestedPromise = true;
                if (promise.prev === undefined)
                    break;
                promise = promise.prev;
            }
            if (promise.name === 'set')
                hasSet = true;

            // We now have the first Promise/command for the instance
            promise.isNestedPromise = true;
            promise.depth = 1;
            promise.prev = self;
            obj[key] = promise;

            lastPromise.hasSet = hasSet;
        }
    })
    this.keys = Object.keys(obj);
    return obj;
}

Promise.then.preloader = function(args) {
    var cb = args[0];
    if (cb.length < 1) return;
    var argName = cb.toString().match(/\([^\), ]+/)[0].substr(1);
    if (argName === '$') {
        this.useWindow = true;
        this.usejQuery = true;
    }else if (argName === 'window') {
        this.useWindow = true;
    }else if (argName === 'document') {
        this.useDocument = true;
    }
}



function isTokenizedString(str) {
    return str.search(/[\%\$]\{[^\}]+\}/) !== -1;
}

function parseTokenizedString(str) {
    var f = 'return ';
    str = str.replace(/(.*?)([\%\$]\{([^\}]+)\})/g, function(m, a, b, c) {
        if (a.length !== 0)
            f = f+'"'+a+'"+';
            if (b.charAt(0) === '$')
                f += 'context.get("'+c+'").content()+';
            else if (b.charAt(0) === '@')
                f += 'context.'+c+'+';
            else
                f += 'data'+(c.charAt(0)==='['?c:'.'+c)+'+';
        return '';
    })
    f += '"'+str+'"';
    return new Function('context', 'data', f);
}

function formQueryParams(form) {
    var doc = form.doc();
    var obj = {
        action: doc.request.url,
        method: form.attr('method') || 'get',
        params: {}
    };
    var action = form.attr('action');
    if (action !== null)
        obj.action = URL.resolve(obj.action, action);
    var params = obj.params;
    var inputs = form.find('[name]');
    var length = inputs.length;
    for (var i = 0; i < length; i++) {
        var input = inputs[i];
        var name = input.attr('name');
        var type = input.attr('type');
        var elName = input.nodeName;
        if (elName === 'select') {
            var option = input.get('option[selected]')||input.get('option:first');
            if (!option) {
                params[name] = '';
            }else{
                params[name] = option.attr('value')||option.content();
            }
        } else if (elName === 'textarea') {
            params[name] = input.content();
        } else if (type === 'checkbox') {
            if (input.attr('checked') === null) continue;
            var name = name.replace(/\[\]$/, '');
            var val = input.attr('value')||'on';
            if (Array.isArray(params[name]))
                params[name].push(val);
            else if (params[name] !== undefined)
                params[name] = [params[name], val];
            else
                params[name] = val;
        } else if (elName === 'input') {
            params[name] = input.attr('value');
        }
        if (params[name] === null)
            params[name] = '';
    }
    return obj;
}

function getLocation(context) {
    var location = '';
    if (context.doc().request !== undefined)
        location = context.doc().request.url;
    if (typeof context.name === 'function')
        location += ' (' + context.path() + ')';
    else
        location += ' (' + context.doc().root().path() + ')';
    if (location.length !== 0)
        location = ' in ' + location
    return location;
}

function getContent(el) {
    if (el === null) return undefined;
    if (el.text !== undefined)
        return el.text().trim();
    else if (el.value !== undefined)
        return el.value().trim();
    return undefined;
}

var urlAttrs = ['href', 'src', 'value', 'link', 'rel'];

function getURL(el) {
    var val = null;
    urlAttrs.some(function(attr) {
        if (el.attr === undefined)
            return false;
        val = el.attr(attr);
        if (!val) return false;
        return true;
    })
    return val || getContent(el);
}

function isURL(s) {
    return (s !== null && s !== undefined && (s.charAt(0) === '/' || s.substr(0, 4) === 'http'))
}

function setInnerHTML(selector) {
   return function(context) {
       if (selector.length === 0)
           var el = context;
       else
           var el = context.find(selector);
       if (el)
           return el.toString();
       return null;
   }
}

var extend = function(object, donor, replace) {
	var key, keys = Object.keys(donor);
	var i = keys.length;
	while (i--) {
		key = keys[i];
        if (replace === false && object[key] !== undefined) continue;
        object[key] = donor[key];
    }
    return object;
}

module.exports = Promise;
