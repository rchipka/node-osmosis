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
libxml.Document.prototype.css2xpath =
libxml.Element.prototype.css2xpath = function(sel, from_root) {
    sel = sel.replace('@', '/@');
    if (sel.charAt(0) === '[')
	sel = '*'+sel;
    sel = css2xpath('.//'+sel);
    sel = sel.replace('///', '//');
    /*
    if (!from_root)
	sel = this.path()+sel;
	*/
    return sel;
}
var cachedSelectors = {};
// detect if `sel` is a CSS selector and convert to XPath
libxml.Document.prototype.find = function(sel, cache) {
    return this.root().find(sel, cache);
}
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
    processStatsThreshold: 15, // print process stats after +-15 megabytes or requests
    parse_response: false,
    decode: true,
    follow: 3,
    follow_set_cookies: true,
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
    this.pausedInstances = [];
    this.lastram = mem.rss;
    this.lastStack = 0;
    this.stack = 0;
    this.instanceStack = [];
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
    // We don't use parseXml in order to avoid libxml namespaces
    //if (data.substr(0,2) === '<?')
    //    return libxml.parseXml(data);
    //else
        return libxml.parseHtml(data);
}

Parser.prototype.request = function(instance, depth, method, url, params, cb, opts) {
    opts = opts||{};
    this.stack++;
    this.instanceStack[instance]++;
    this.queue[depth||0].push([instance, opts.tries||this.opts.tries, method, url, params, cb, opts]);
    this.requestQueue();
}

Parser.prototype.requestQueue = function() {
    var self = this;
    if (this.requests < this.opts.concurrency) {
        var arr = this.nextQueue();
        if (arr === false)
            return;
        var instance = arr.shift();
        var tries = arr.shift()-1;
        var method = arr.shift();
        var url = arr.shift();
        var params = arr.shift();
        var cb = arr.shift();
        var opts = extend(arr.shift()||{}, parser.opts, false);
	if (parser.opts.cookies !== undefined)
	    opts.cookies = parser.opts.cookies;
	
	if (url.charAt(0) === '/' && url.charAt(1) === '/')
	    url = 'http:'+url;
        self.requests++;
        self.requestCount++;
	needle.request(method, url, params, opts, function(err, res, data) {
	    try {
		self.requests--;
		if (err !== null)
		    throw(err);
		if (opts.parse !== false) {
		    if (data.length == 0)
			throw(new Error('Document is empty'))
		    var document = null;
		    if (res.headers['content-type'] !== undefined && res.headers['content-type'].indexOf('xml') !== -1) {
			document = libxml.parseXml(data.toString().replace(/ ?xmlns=['"][^'"]*./g, ''));
		    }else
			document = libxml.parseHtml(data);
		    if (document.errors[0] !== undefined && document.errors[0].code === 4)
			    throw(new Error('Document is empty'))
		    if (res.socket !== undefined) {
			document.request = {
			    url: url,
			    path: res.socket._httpMessage.path,
			    method: method,
			    params: params,
			    headers: res.req._headers
			}
			document.response = {
			    statusCode: res.statusCode,
			    size: {
				total: res.socket.bytesRead,
				headers: res.socket.bytesRead-data.length,
				body: data.length,
			    },
			    headers: res.headers
			}
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
		    parser.instanceStack[instance]++;
		    self.queue[self.queue.length-1].push([instance, tries, method, url, params, cb, opts])
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
    if (this.pausedInstances[0] === true) return false;
    for (var i = this.queue.length;i--;) {
        for (var c = this.queue[i].length;c--;) {
	    if (this.pausedInstances.length === 0 || this.pausedInstances.indexOf(this.queue[i][c][0]) === -1)
		return this.queue[i].splice(c, 1)[0];
        }
    }
    return false;
}

Parser.prototype.stopInstance = function(instance) {
    for (var i = this.queue.length;i--;) {
	if (instance === true) {
	    parser.stack -= this.queue[i].length;
	    this.queue[i] = [];
	}else{
	    for (var c = this.queue[i].length;c--;) {
		if (this.queue[i][c][0] === instance) {
		    parser.stack--;
		    this.queue[i].splice(c, 1);
		}
	    }
	}
    }
}

Parser.prototype.resources = function() {
    var c = this.stack+this.requestCount;
    if (this.stack !== 0 && (this.stack <= 3 || Math.abs(this.lastStack-c) < parser.opts.processStatsThreshold)) return;
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