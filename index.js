var needle = require('needle');
var libxml = require('libxmljs-dom');
var URL    = require('url');

/*
 *
 * libxml overrides:
 *
 */

libxml.Document.prototype.dom = function(instance, opts, cb, requestsDone) {
    if (this.doc().__window !== undefined) {
        if (cb !== undefined) cb(this.doc().__window);
        return this.doc().__window;
    }
    return new libxml.Window(this, function(method, url, data, cb, opts) {
        instance.request(method, url, data, function(err, doc, data) {
            cb(err, doc, data);
            instance.stack.pop();
        }, opts)
    }, opts, cb);
}

// move the original context.find to context.findXPath
libxml.Document.prototype.findXPath = libxml.Document.prototype.find;
libxml.Element.prototype.findXPath = libxml.Element.prototype.find;


libxml.Element.prototype.getAttr = libxml.Element.prototype.attr;
libxml.Element.prototype.attr = function(name) {
    if (typeof name === 'string') {
        var attr = this.getAttr(name);
        if (attr !== null)
            return attr.value();
        else
            return null;
    } else {
        return this.getAttr(name);
    }
}

libxml.Document.prototype.find = function(sel, cache) {
    return this.root().find(sel, cache);
}

// detect if `sel` is a CSS selector and convert to XPath
libxml.Element.prototype.find = function(sel) {
    if (sel.charAt(1) === '/' || sel.charAt(0) === '/') {
        return this.findXPath(sel);
    }else if (cachedSelectors[sel] === undefined) {
        cachedSelectors[sel] = libxml.css2xpath(sel);
        //console.log(cachedSelectors[sel])
    }
    return this.findXPath(cachedSelectors[sel]) || [];
}

var cachedSelectors = {};
function convertSelector(sel) {
}

// try different ways of getting content
libxml.Element.prototype.content = function() {
    if (this.text !== undefined)
        return this.text().trim();
    else if (this.value !== undefined)
        return this.value().trim();
    else if (this.toString !== undefined)
        return this.toString().trim();
    return undefined;
}

var Parser = function(promise) {
    var self = this;
    this.promise = promise;
    this.requests = 0;
    this.queue = [];
    this.resumeQueue = [];
    this.cookies = {};
    this.paused = false;
    this.stack = {
        count: 0,
        requests: 0,
        push: function() {
            return ++this.count;
        },
        pop: function() {
            var stack = this;
            process.nextTick(function() {
                if (--stack.count === 0) {
                    promise.done();
                    self.resources();
                }
            })
            return stack.count;
        }
    }
    module.exports.opts = this.opts;
}

Parser.prototype.opts = {
    processStatsThreshold: 50, // print process stats after +-15 megabytes or requests
    parse_response: false,
    decode: true,
    follow: 3,
    follow_set_cookies: true,
    follow_set_referer: true,
    rejectUnauthorized: false,
    keep_data: false,
    compressed: true,
    timeout: 30 * 1000,
    accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    user_agent: 'Mozilla/5.0 (Windows NT x.y; rv:10.0) Gecko/20100101 Firefox/10.0',
    concurrency: 5,
    tries: 3
}

Parser.prototype.resume = function(arg) {
    if (typeof arg === 'function') {
        this.resumeQueue.push(arg);
    }else{
        this.resumeQueue.forEach(function(cb) {
            cb();
        })
    }
}

Parser.prototype.config = function(opts) {
    opts = opts || {};
    for (var key in opts) {
        this.opts[key] = opts[key];
    }
}

Parser.prototype.parse = function(data) {
    // We don't use parseXml in order to avoid libxml namespaces
    return libxml.parseHtml(data);
}

Parser.prototype.request = function(method, url, params, cb, opts) {
    this.queue.push([opts.tries || opts.tries, method, url, params, cb, opts]);
    this.requestQueue();
}

Parser.prototype.requestQueue = function() {
    var self = this;
    if (this.stack.requests < this.opts.concurrency) {
        var arr = this.queue.pop();
        if (arr === undefined)
            return;
        var tries       = arr.shift() - 1;
        var method      = arr.shift();
        var url         = arr.shift();
        var params      = arr.shift();
        var cb          = arr.shift();
        var opts        = arr.shift();

        if (url.charAt(0) === '/' && url.charAt(1) === '/')
            url = 'http:' + url;
        else if (url.indexOf('http') !== 0)
            url = 'http://' + url;

        url = URL.parse(url, true);
        if (method.charAt(0) === 'g') {
            url.search = '';
            for (var key in params) {
                url.query[key] = params[key];
            }
            params = url.query;
        }
        var host = url.hostname;
        var query = url.query;
        url = URL.format(url);

        if (self.cookies[host] !== undefined) {
            if (opts.cookies === undefined)
                opts.cookies = {};
            extend(opts.cookies, self.cookies[host])
        }

        self.requests++;
        self.stack.requests++;
        self.stack.push();
        needle.request(method, url, params, opts, function(err, res, data) {
            self.stack.requests--;
            var document = null;
            if (opts.process_response !== undefined)
                data = opts.process_response(data);
            if (res.statusCode >= 400 && res.statusCode < 500 && opts.ignore_http_errors !== true)
                err = res.statusCode+' '+res.statusMessage;
            if (opts.parse !== false) {
                if (err) {
                }else if (data.length == 0)
                    err = 'Document is empty';
                //else if (res.headers['content-type'] !== undefined && res.headers['content-type'].indexOf('xml') !== -1)
                //    document = libxml.parseXml(data.toString().replace(/ ?xmlns=['"][^'"]*./g, ''));
                else
                    document = libxml.parseHtml(data);
                if (document !== null) {
                    if (document.errors[0] !== undefined && document.errors[0].code === 4)
                        err = 'Document is empty';
                    if (res.socket !== undefined) {
                        document.request = {
                            url: url,
                            path: res.socket._httpMessage.path,
                            method: method,
                            params: params||{},
                            query:  query,
                            headers: res.req._headers
                        }
                        document.response = {
                            type: (res.headers['content-type']||'').indexOf('xml')!==-1?'xml':'html',
                            statusCode: res.statusCode,
                            statusMessage: res.statusMessage,
                            size: {
                                total: res.socket.bytesRead,
                                headers: res.socket.bytesRead - data.length,
                                body: data.length,
                            },
                            headers: res.headers
                        }
                        if (self.opts.keep_data === true)
                            document.response.data = data;
                    }
                    if (res.cookies !== undefined) {
                        if (self.cookies[host] === undefined)
                            self.cookies[host] = res.cookies;
                        else
                            extend(self.cookies[host], res.cookies);
                    }
                    document.root().namespace(url);
                }
            }else{
                document = data;
            }
            if (err) {
                if (tries > 0) {
                    self.stack.push();
                    self.queue.push([tries, method, url, params, cb, opts])
                    self.promise.log(url+' - tries: '+(self.opts.tries-(tries-1))+'/'+self.opts.tries+'')
                }
                if (err.message !== undefined)
                    err = err.message;
            }
            cb(err, res, document);
            self.requestQueue();
            self.resources();
        });
    }
}

var prevMem = 0;
Parser.prototype.resources = function() {
    if (this.requests % this.opts.processStatsThreshold === 0) return;
    var mem = process.memoryUsage();
    var memDiff = mem.rss - prevMem;
    memDiff = toMB(memDiff);
    if (memDiff.charAt(0) !== '-')
        memDiff = '+' + memDiff;
    this.promise.debug('(process) stack: ' + this.stack.count + ', RAM: ' + toMB(mem.rss) + ' (' + memDiff + ') requests: ' + this.requests + ', heap: ' + toMB(mem.heapUsed) + ' / ' + toMB(mem.heapTotal));
    prevMem = mem.rss;
}

function toMB(size) {
    return (size / 1024 / 1024).toFixed(2) + 'Mb';
}

function extend(obj1, obj2, replace) {
    for (var i in obj2) {
        if ((replace === false && obj1[i] !== undefined)) continue;
        obj1[i] = obj2[i];
    }
    return obj1;
}

var Promise = require('./lib/promise.js')(Parser);
module.exports = new Promise;
module.exports.config = function(key, val) {
    var opts = Parser.prototype.opts;
    if (key === undefined)
        return opts;
    if (typeof key === 'object') {
        extend(opts, key, true);
    }else if (typeof key === 'function') {
        key(opts);
    }else{
        opts[key] = val;
    }
    return this;
}
