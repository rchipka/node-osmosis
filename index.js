var URL         = require('url');
var needle	= require('needle');
var cookies	= require('needle/lib/cookies.js');
var libxml	= require('libxmljs');
var util        = require('util');
var css2xpath   = require('./lib/css2xpath.js');

/*
 *
 * libxml overrides:
 * 
 */

/*
 make context.doc() always return the current Document
 even if the context already is the current Document
 */
libxml.Document.prototype.doc = function() {
    return this;
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
    }else{
	return this.getAttr(name);
    }
}
libxml.Document.prototype.css2xpath,
libxml.Element.prototype.css2xpath = function(sel, from_root) {
    sel = sel.replace('@', '/@');
    sel = css2xpath('.//'+sel);
    sel = sel.replace('///', '//');
    /*
    if (!from_root)
	sel = this.path()+sel;
	*/
    return sel;
}
var cachedSelectors = {};
// detect if it a CSS selector and convert to XPath
libxml.Document.prototype.find,
libxml.Element.prototype.find = function(sel, cache) {
    var xpath;
    if (cache !== false)
	xpath = cachedSelectors[sel];
    if (xpath === undefined) {
	if (sel.charAt(0) !== '/') {
	    xpath = this.css2xpath(sel)
	    if (cache !== false)
		cachedSelectors[sel] = xpath;
	}else{
	    xpath = sel;
	}
    }
    var res = this.findXPath(xpath)||[];
    res.xpath = xpath;
    return res;
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


var default_opts = {
    parse_response: false,
    decode: true,
    follow: 3,
    //follow_set_cookies: true, // broken as of Needle 0.9.1 (http://github.com/tomas/needle/issues/121)
    follow_set_referer: true,
    compressed: true,
    timeout: 30 * 1000,
    accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    user_agent: 'Mozilla/5.0 (Windows NT x.y; rv:10.0) Gecko/20100101 Firefox/10.0',
    concurrency: 5,
    tries: 3
}

var Parser = function(opts) {
    opts = opts||{};
    this.libxml = libxml;
    this.needle = needle;
    var mem = process.memoryUsage();
    this.lastram = mem.rss;
    this.lastStack = 0;
    this.stack = 0;
    this.opts = extend(opts, default_opts, false);
    this.needle.defaults(this.opts);
    this.requestCount = 0;
    this.requests = 0;
    this.queue = {
        length:0,
    };
    return;
}

Parser.prototype.parse = function(data) {
    if (data.substr(0,2) === '<?')
        return libxml.parseXml(data);
    else
        return libxml.parseHtml(data);
}

Parser.prototype.request = function(depth, method, url, params, cb, opts) {
    opts = opts||{};
    this.stack++;
    this.queue[depth||0].push([opts.tries||this.opts.tries, method, url, params, cb, opts]);
    this.requestQueue();
}

Parser.prototype.requestQueue = function() {
    var self = this;
    if (this.requests < this.opts.concurrency) {
        var arr = this.nextQueue();
        if (arr === false)
            return;
        var tries = arr.shift()-1;
        var method = arr.shift();
        var url = arr.shift();
        var params = arr.shift();
        var cb = arr.shift();
        var opts = arr.shift()||{};
	opts.cookies = parser.opts.cookies;
        self.requests++;
        self.requestCount++;
	needle.request(method, url, params, opts, function(err, res, data) {
	    try {
		self.requests--;
		if (err !== null)
		    throw(err);
		if (opts.parse !== false) {
		    if (!res.socket._httpMessage._hasBody || data.length == 0)
			throw(new Error('Document is empty'))
		    var document = null;
		    if (res.headers['content-type'] !== undefined && res.headers['content-type'].indexOf('xml') !== -1)
			document = libxml.parseXml(data);
		    else
			document = libxml.parseHtml(data);
		    if (document.errors[0] !== undefined && document.errors[0].code === 4)
			    throw(new Error('Document is empty'))
		    document.request = {
			url: url,
			path: res.socket._httpMessage.path,
			method: method,
			params: params,
			headers: res.req._headers
		    }
		    document.response = {
			size: {
			    total: res.socket.bytesRead,
			    headers: res.socket.bytesRead-data.length,
			    body: data.length,
			},
			headers: res.headers
		    }
		    if (res.cookies !== undefined) {
			parser.p.config('cookies', res.cookies);
		    }else if (res.req._headers['cookie'] !== undefined) {
			/*
			 * if Needle followed a redirect after login
			 * we won't have a set-cookie response header
			 * so we'll look in the request header instead
			*/
			parser.p.config('cookies', cookies.read(res.req._headers['cookie']));
		    }
		    if (cb.length === 1)
			cb(document);
		    else
			cb(null, document);
		    document = null;
		    data = null;
		}else{
		    cb(err, res, data)
		}
		self.requestQueue();
	    }catch(err) {
		if (tries > 0) {
		    parser.stack++;
		    self.queue[self.queue.length-1].push([tries, method, url, params, cb])
		}
		err.message += '\n['+method+'] '+url+' tries: '+(self.opts.tries-tries)+' - '+err.message;
		if (cb.length > 1)
		    cb(err.stack, null);
		self.requestQueue();
	    }
	    self.resources();
	});
    }
}

Parser.prototype.nextQueue = function() {
    for (var i = this.queue.length;i--;) {
        if (this.queue[i].length !== 0) {
            return this.queue[i].pop();
        }
    }
    return false;
}

Parser.prototype.resources = function() {
    var c = this.stack+this.requestCount;
    if (this.stack !== 0 && (this.stack <= 3 || Math.abs(this.lastStack-c) < 15)) return;
    var mem = process.memoryUsage();
    var memDiff = toMB(mem.rss-this.lastram);
    if (memDiff.charAt(0) !== '-')
	memDiff = '+'+memDiff;
    this.p.debugNext('(process) stack: '+this.stack+', RAM: '+toMB(mem.rss)+' ('+memDiff+') requests: '+this.requestCount+', heap: '+toMB(mem.heapUsed)+' / '+toMB(mem.heapTotal));
    this.lastram = mem.rss;
    this.lastStack = c;
}

function toMB(size) {
    return (size/1024/1024).toFixed(2)+'Mb';
}

function extend(obj1, obj2, replace) {
    for (i in obj2) {
        if ((replace === false && obj1[i] !== undefined)) continue;
        obj1[i] = obj2[i];
    }
    return obj1;
}

var parser = new Parser();
var Promise = require('./lib/promise.js')(parser);
parser.p = new Promise();
module.exports = parser.p;