var URL = require('url');
var fs = require('fs');

var Promise = {

    click: function(context, data, next, done) {
        var selector = this.args[0];
        var opts     = this.args[1];

        var nodes = context.find(selector);
        if (nodes.length === 0) {
            this.debug('no results for "'+selector+'"'+getLocation(context));
            return done();
        }
        var self = this;
        context.doc().dom(this.instance, opts, function(window) {
            window.stack.done = function() {
                next(context, data);
                done();
            }
            nodes.forEach(function(node) {
                self.debug("clicking", node.name())
                node.dispatchEvent('click')
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
        this.next.start(context.doc(), data);
    },

    dom: function(context, data, next) {
        var callback = this.args[0];
        var opts     = this.args[1];

        context.doc().dom(this.instance, opts, function(window) {
            callback(window, data, function(context, data) {
                if (context.window !== undefined)
                    context = context.document;
                next(context, data)
            });
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
        var self = this;

        if (this.name[0] === 's')
            var res = context.find(selector);
        else
            var res = context.doc().find(selector);

        if (res.length < 1) {
            this.error('no results for "' + selector + '"' + getLocation(context.doc()));
            done();
            return;
        }

        this.log('found ' + res.length + ' results for "' + selector + '"' + getLocation(context.doc()))
        var i = 0;
        res.forEach(function(el, i) {
            el.last = (res.length - 1 == i);
            el.index = i;
            next(el, data);
        });
        done();
    },

    follow: function(context, data, next, done) {
        var selector = this.args[0];
        var external = this.args[1];
        var rewrite  = this.args[2];
        var self = this;
        var res = context.find(selector);
        var doc = context.doc();

        if (res === undefined || res.length === 0) {
            this.debug('no results for "' + selector + '"' + getLocation(context));
            done(context, data);
            return;
        } else {
            var opts = {
                headers: {}
            }
            if (this.instance.opts.follow_set_referer !== false)
                opts.headers['referer'] = doc.request.url;
            var count = 0;
            res.forEach(function(el, i) {
                if (selector.indexOf('@') !== -1)
                    var val = el.value()
                else
                    var val = getURL(el);
                if (val !== null) {
                    var url = URL.resolve(doc.request.url, val);
                    if (external === false && url.indexOf(doc.request.url) === -1)
                        return;
                    if (rewrite !== undefined)
                        url = URL.resolve(doc.request.url, rewrite(url));
                    if (!url) return;
                    count++;
                    self.log("url: " + url)
                    self.request('get', url, undefined, function(document) {
                        next(document, data);
                        if (--count === 0)
                            done();
                    }, opts)
                }
            });
            if (count === 0)
                done();
        }
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

        var userInput = form.get('input:before(input[type="password"]):last');
        var passInput = form.get('input[type="password"]');

        if (!passInput) {
            this.error('No password field found');
            return;
        }

        if (!userInput) {
            this.error('No user field found');
            return;
        }

        params[userInput.attr('name')] = user;
        params[passInput.attr('name')] = pass;

        /*
         * set any other input values
         */
        form.find('input').forEach(function(input) {
            var name = input.attr('name');
            if (params[name] !== undefined) return;
            params[name] = input.attr('value');
        })

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

        var headers = {
            referer: doc.request.url
        };
        if (typeof selector === 'string') {
            var node = doc.get(selector);
            if (!node) {
                this.error('no results for "' + selector + '" in ' + url);
                return;
            } else if (node.name() === 'form') {
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
        if (this.instance.opts.follow_set_referer !== false)
            headers.referer = url;
        this.log('loading ' + count + '/' + limit + ' - ' + url);
        var self = this;
        this.request(method, url, params, function(c) {
            c.request.count = count + 1;
            self.start(c, data);
        }, {
            headers: headers
        })
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

        var keys = Object.keys(args);

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
                            context.find(v).forEach(function(e) {
                                d.push(getContent(e));
                            })
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
                    data.obj[key] = getContent(context.get(val));
                }
                loopObject();
            }
        }
        loopObject();
    },

    submit: function(context, data, next) {
        var selector = this.args[0];
        var params = this.args[1];

        var form = context.get(selector);
        if (form === null) {
            this.error(selector + ' not found');
            this.next.start(null);
            return;
        }
        var url = URL.resolve(context.doc().request.url, form.attr('action') || context.doc().request.url);
        var action = form.attr('action') || context.doc().request.url;
        var method = form.attr('method') || 'get';
        var inputs = form.find('[name]');
        inputs.forEach(function(input) {
            var name = input.attr('name');
            if (params[name] !== undefined) return;
            var elName = input.name();
            if (elName === 'select') {
                var selected = input.get('option[selected]');
                if (selected) {
                    params[name] = selected.content();
                } else {
                    params[name] = input.get('option').content();
                }
            } else if (elName === 'textarea') {
                params[name] = input.content();
            } else if (elName === 'checkbox') {
                params[name] = input.attr('checked');
            } else if (elName === 'input') {
                params[name] = input.attr('value');
            }
        })
        var self = this;
        this.debug(method + ' ' + url + ' ' + JSON.stringify(params));
        this.request(method, url, params, function(c) {
            next(c, data);
        });
    },

    then: function(context, data, next, done) {
        var cb   = this.args[0];
        var self = this;
        try {
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
        } catch (err) {
            this.error(err.stack);
        }
    },
}
Promise.paginate = Promise.page;
Promise.post = Promise.get;
Promise.select = Promise.find;
Promise.fail = Promise.failure;
Promise.success = Promise.filter;

/*
 * process argument order for speed
 *
 */

Promise.do.preloader = function(args) {
    var self = this;
    args.forEach(function(obj, i) {
        obj.isNestedPromise = true;
        obj.cb = obj.setChildData;
        obj.next = self;
        while (obj.prev != undefined) {
            obj = obj.prev;
        }
        obj.isNestedPromise = true;
        obj.depth = 1;
        obj.prev = self;
        args[i] = obj;
    })
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

            for (var i = promise.depth; i--;) {
                promise.depth = i + 2;
                promise.parent = self;
                promise.isNestedPromise = true;
                if (promise.prev === undefined)
                    break;
                promise = promise.prev;
            }

            // We now have the first Promise/command for the instance
            promise.isNestedPromise = true;
            promise.depth = 1;
            promise.prev = self;
            obj[key] = promise;
        }
    })
    return obj;
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
        action: form.attr('action') || doc.request.url,
        method: form.attr('method') || 'get',
        params: {}
    };
    var params = obj.params;
    var inputs = form.find('[name]');
    inputs.forEach(function(input) {
        var name = input.attr('name');
        if (params[name] !== undefined) return;
        var elName = input.name();
        if (elName === 'select') {
            var selected = input.get('option[selected]');
            if (selected) {
                params[name] = selected.content();
            } else {
                params[name] = input.get('option').content();
            }
        } else if (elName === 'textarea') {
            params[name] = input.content();
        } else if (elName === 'checkbox') {
            params[name] = input.attr('checked');
        } else if (elName === 'input') {
            params[name] = input.attr('value');
        }
        if (params[name] === null)
            params[name] = '';
    })
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

function extend(obj1, obj2, replace) {
    for (i in obj2) {
        if ((replace === false && obj1[i] !== undefined)) next.start;
        obj1[i] = obj2[i];
    }
    return obj1;
}

module.exports = Promise;
