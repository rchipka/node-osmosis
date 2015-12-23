'use strict';
var needle = require('needle');
var libxml = require('libxmljs-dom');
var URL    = require('url');
var qs     = require('querystring');

/*
 *
 * libxml overrides:
 *
 */

libxml.Document.prototype.dom = function(promise, opts, cb, requestsDone) {
    if (this.doc().__window !== undefined) {
        if (cb !== undefined) cb(this.doc().__window);
        return this.doc().__window;
    }
    return new libxml.Window(this, function(method, url, data, cb, opts) {
        promise.request(method, url, data, function(err, doc, data) {
            cb(err, doc, data);
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
    this.doneCount = 0;
    this.requests = 0;
    this.queue = [];
    this.resumeQueue = [];
    this.paused = false;
    this.stopped = false;
    this.stack = {
        count: 0,
        requests: 0,
        change: 0,
        push: function() {
            if (++this.change >= self.opts.processStatsThreshold) {
                if (self.opts.debug === true)
                    self.resources();
                this.change = 0;
            }
            return ++this.count;
        },
        pop: function() {
            var stack = this;
            process.nextTick(function() {
                if (--stack.count === 0) {
                    promise.done();
                    if (self.opts.debug === true)
                        self.resources();
                }
            })
            stack.change++;
            return stack.count;
        }
    }
    module.exports.opts = this.opts;
}

Parser.prototype.opts = {
    processStatsThreshold: 25,
    parse_response: false,
    decode_response: true,
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
        var length = this.resumeQueue.length
        for (var i = 0; i < length; i++) {
            this.resumeQueue[i]();
        }
    }
}

Parser.prototype.config = function(opts) {
    opts = opts || {};
    for (var key in opts) {
        this.opts[key] = opts[key];
    }
}

Parser.prototype.parse = function(data, opts) {
    // We don't use parseXml in order to avoid libxml namespaces
    return libxml.parseHtml(data, opts);
}

Parser.prototype.request = function(method, url, params, cb, opts) {
    this.queue.push([opts.tries, method, url, params, cb, opts]);
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

        if (url.substr(0, 1) === '//')
            url = 'http:' + url;
        else if (url.substr(0, 4) !== 'http')
            url = 'http://' + url;

        url = URL.parse(url, true);

        url.params = params;
        if (method.charAt(0) === 'g') {
            for (var key in params) {
                url.query[key] = params[key];
            }
            url.params = url.query;
            url.search = qs.stringify(url.query);
            params = undefined;
        }
        var href = url.href = URL.format(url);

        if (Array.isArray(opts.proxy))
            opts.proxies = opts.proxy;
        if (opts.proxies !== undefined) {
            var proxies = opts.proxies;
            if (proxies.index === undefined || ++proxies.index >= proxies.length)
                proxies.index = 0;
            opts.proxy = proxies[proxies.index];
        }

        self.requests++;
        self.stack.requests++;
        self.stack.push();
        var req = needle.request(method, href, params, opts, function(err, res, data) {
            self.stack.requests--;
            var document = null;

            if (opts.process_response !== undefined)
                data = opts.process_response(data);

            if (err === null && res.statusCode >= 400 && res.statusCode <= 500 && opts.ignore_http_errors !== true)
                err = res.statusCode+' '+res.statusMessage;

            if (opts.parse !== false) {
                if (err) {
                }else if (data === null || data.length == 0) {
                    if (method !== 'head')
                        err = 'Data is empty';
                //else if (res.headers['content-type'] !== undefined && res.headers['content-type'].indexOf('xml') !== -1)
                //    document = libxml.parseXml(data.toString().replace(/ ?xmlns=['"][^'"]*./g, ''));
                }else{
                    document = libxml.parseHtml(data, { baseUrl: href });
                }
                if (document !== null) {
                    if (document.errors[0] !== undefined && document.errors[0].code === 4) {
                        err = 'Document is empty';
                    }else if (document.root() === null) {
                        err = 'Document has no root';
                    }else{
                        url.url     = href;
                        url.method  = method;
                        url.headers = res.req._headers;
                        url.proxy   = opts.proxy;
                        url.user_agent = opts.user_agent;

                        document.location = url;
                        document.request = url;
                        document.response = {
                            type: (res.headers['content-type']||'').indexOf('xml')!==-1?'xml':'html',
                            statusCode: res.statusCode,
                            statusMessage: res.statusMessage,
                            headers: res.headers
                        }
                        if (self.opts.keep_data === true)
                            document.response.data = data;

                        if (res.socket !== undefined) {
                            url.path    = res.socket._httpMessage.path.replace(/\?$/, '');
                            document.response.size = {
                                total: res.socket.bytesRead,
                                headers: res.socket.bytesRead - data.length,
                                body: data.length,
                            }
                        }

                        if (opts.cookies === undefined)
                            opts.cookies = {};

                        if (res.cookies !== undefined)
                            extend(opts.cookies, res.cookies);

                        if (document.cookies === undefined)
                            document.cookies = {};
                        extend(document.cookies, opts.cookies);
                    }
                }
            }else{
                document = data;
            }
            if (err) {
                if (proxies !== undefined && (res === undefined || res.statusCode !== 404)) {
                    if (self.opts.error === true)
                        self.promise.error('proxy '+(proxies.index+1)+'/'+proxies.length+' failed ('+opts.proxy+')')
                    if (Array.isArray(proxies) && proxies.length > 1) {
                        opts.proxies.splice(proxies.index, 1);
                        opts.proxy = proxies[proxies.index];
                    }
                }
                if (err.message !== undefined)
                    err = err.message;
                if (tries > 0) {
                    err += ', trying again';
                    self.stack.push();
                    self.queue.push([tries, method, href, params, cb, opts])
                    if (self.opts.log === true)
                        self.promise.log(href+' - tries: '+(opts.tries-tries)+'/'+opts.tries+'')
                }
            }
            if (res !== undefined)
                res.url = url;
            cb(err, res, document);
            self.requestQueue();
        });

        req.on('redirect', function(new_url) {
            if (self.opts.log === true)
                self.promise.log('[redirect] '+url.href+' -> '+new_url)
            extend(url, URL.parse(new_url));
        })
    }
}

var prevMem = 0;
Parser.prototype.resources = function() {
    var mem = process.memoryUsage();
    var libxml_mem = libxml.memoryUsage();
    var nodes = libxml.nodeCount();
    if (nodes >= 1000)
        nodes = (nodes/1000).toFixed(0)+'k';
    var memDiff = mem.rss - prevMem;
    memDiff = toMB(memDiff);
    if (memDiff.charAt(0) !== '-')
        memDiff = '+' + memDiff;
    this.promise.debug('(process) stack: ' + this.stack.count +', ' +
               'requests: ' + this.requests + ' (' + this.stack.requests + ' queued), '+

                        'RAM: ' + toMB(mem.rss) + ' (' + memDiff + '), '+
                        'libxml: ' + ((libxml_mem/mem.rss)*100).toFixed(1) + '% ('+nodes+ ' nodes), '+
                        'heap: ' + ((mem.heapUsed/mem.heapTotal)*100).toFixed(0) + '% of ' + toMB(mem.heapTotal));
    prevMem = mem.rss;
}

function toMB(size, num) {
    return (size / 1024 / 1024).toFixed(num||2) + 'Mb';
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
