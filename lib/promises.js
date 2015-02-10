var URL             = require('url');

var promises = {
    then: function(cb) {
        var self = this;
        cb.bind(self, function(context) { self.next(context) })();
    },
    
    /* find elements based on css or xpath selector */
    
    find: function(selector, opts) {
        var self = this;
        //this.log('searching for "'+opts.original+'" in '+this.data.url);
        var res = this.find(selector)
        if (res.length < 1) {
            this.error('no results for "'+opts.original+'" in '+this.data.url);
            return;
        }
        
        this.log('found '+res.length+' results for "'+opts.original+'"'+' in '+this.data.url)
        var i = 0;
        res.forEach(function(el) {
	    el.data = clone(this.data)||{};
	    self.next(el);
        });
        
	if (opts.stop !== undefined && opts.stop()) {
	    this.log('stopping...');
	    self.prev();
	    return
	}
        if (opts.next !== undefined) {
            if (typeof opts.next === 'function') {
                opts.next.call(this, this.prev);
            }else{
                var res = self.find(opts.next, true);
                res.forEach(function(el) {
                    var val = getURL(el);
                    if (val !== null) {
                        var url = URL.resolve(self.data.url, val);
                        self.request(url, function(document) {
                            self.prev(document);
                        })
                    }
                })
            }
        }
    },
    
    /* follow a url found in given element(s) */
    follow: function(selector, opts) {
        var self = this;
        var res = self.find(selector);
        
        if (res === undefined || res.length === 0) {
            this.debug('no results for '+selector)
        }else{
            res.forEach(function(el) {
		if (selector.indexOf('@') !== -1)
		    var val = el.value()
		else
                    var val = getURL(el);
                if (val !== null) {
                    var url = URL.resolve(self.data.url, val);
                    if (opts && opts.rewrite !== undefined) {
                    	url = opts.rewrite(url);
                    }
                    if (!url) return;
                    self.log("url: "+url)
                    self.request(url, function(document) {
                        self.next(document);
                    })
                }
            });
        }
    },
    
    /* set values */

    set: function(obj, opts) {
        for (var key in obj) {
            if (obj[key] === null) {
                this.data[key] = getContent(this);
            }else{
                var selector = obj[key].selector;
                if (obj[key].type === 's') { // string
                    var el = this.get(selector);
                    if (el === undefined) {
                        //this.debug('no data for '+selector)
                    }else{
                        this.data[key] = getContent(el);
                    }
                }else if (obj[key].type === 'a') { // array
                    var els = this.find(selector);
                    if (els === undefined || els.length === 0) {
                        //this.debug('no data for '+selector)
                    }else{ 
                        this.data[key] = [];
                        var self = this;
                        els.forEach(function(el) {
                            self.data[key].push(getContent(el));
                        });
                        if (this.data[key].length === 0)
                            delete this.data[key];
                    }
                }
            }
            if ((!this.data[key] || this.data[key].length === 0) && obj[key].required === true) {
		this.debug(key+' not fonud');
                this.next(null);
                return;
            }
            if (typeof this.data[key] === 'string')
                this.data[key] = this.data[key].trim();
            //this.debug(key+' = '+(this.data[key])+' ('+this.data.url+')');
        }
        this.next();
    },
    
    data: function(cb) {
        cb(this.data);
        this.next();
    }
}

function getContent(el) {
    if (el.text !== undefined)
        return el.text().trim();
    else if (el.value !== undefined)
        return el.value().trim();
    return undefined;
}

var urlAttrs = ['href', 'src', 'rel'];
function getURL(el) {
    var val = getContent(el);
    if (!isURL(val)) {
	urlAttrs.some(function(attr) {
	    if (el.attr === undefined)
		return false;
	    var a = el.attr(attr);
	    if (!a) return false;
	    val = a.value();
	    return true;
	})
    }
    return val;
}

function isURL(s) {
    return (s !== null && s !== undefined && (s.charAt(0) === '/' || s.substr(0,4) === 'http'))
}

/* preprocess arguments for speed */

promises.find.preloader = function(args) {
    args[1] = args[1]||{};
    args[1].original = args[0];
    args[0] = args[0];
    return args;
}

promises.set.preloader = function(args) {
    /*
        if first two args are "key" and "selector" strings
        convert them to { "key" : "selector" } object
    */
    if (typeof args[0] === 'string' && (args[1] === undefined || typeof args[1] === 'string')) {
        var obj = {};
        obj[args[0]] = args[1]||null;
        args[0] = obj;
        if (typeof args[2] === 'object')
            args[1] = args.pop();
    }
    
    /* convert selectors */
    for (var key in args[0]) {
        var val = args[0][key];
        
        var type = 's';
        if (key.substr(key.length-2, 2) === '[]') {
            delete args[0][key];
            key = key.substr(0, key.length-2);
            type = 'a'
        }
        
        if (val) {
            args[0][key] = { type: type };
            if (val.charAt(0) === '!') {
                val = val.substr(1);
                args[0][key].required = true;
            }
            args[0][key].selector = val;
        }
    }
    return args;
}

promises.follow.preloader = function(args) {
    var type = typeof args[0];
    if (type === 'string' || args[0] instanceof String) {
    
    }else if (type === 'object') {
        args[2] = args[0];
        args[0] = undefined;
        args[1] = undefined;
    }
    /*
    if (typeof args[1] === 'object') {
        args[2] = args[1];
        args[1] = undefined;
    }*/
    return args;
}

function clone(obj) {
    if (null == obj || "object" != typeof obj) return obj;
    var copy = obj.constructor();
    for (var attr in obj) {
        if (obj.hasOwnProperty(attr)) copy[attr] = obj[attr];
    }
    return copy;
}

module.exports = promises;