var URL             = require('url');

var promises = {
    then: function(context, data) {
        var self = this;
        this.args[0].call(self, context, data, function(c, d) { self.next.start(c||context, d||data) });
    },
    data: function(context, data) {
        this.args[0].call(this, data);
        this.next.start(context, data);
    },
    
    /* find elements based on css or xpath selector */
    
    find: function(context, data) {
	var selector = this.args[0];
	var next = this.args[1];
        var self = this;
	if (data.page > 1) {
	    console.log(data.page);
	}
        //this.log('searching for "'+opts.original+'" in '+this.data.url);
        var res = context.find(selector);
        if (res.length < 1) {
            this.error('no results for "'+selector+'" in '+context.doc().url);
            self.next.start(null);
	    return;
        }
        
        this.log('found '+res.length+' results for "'+selector+'"'+' in '+context.doc().url)
        var i = 0;
        res.forEach(function(el) {
	    self.next.start(el, data);
        });
        
        if (next === undefined) return;
	if (typeof next === 'function') {
	    next.call(this, context, data, function(c, d) { self.start.call(self, c, d||data) });
	}else{
	    var res = context.find(next, true);
	    self.log('found '+res.length+' results for "'+next+'"'+' in '+context.doc().url)
	    res.forEach(function(el) {
		var val = getURL(el);
		if (val !== null) {
		    self.log('next page is '+val)
		    var url = URL.resolve(context.doc().url, val);
		    if (url == context.doc().url) return;
		    self.request('get', url, function(document) {
			self.start.call(self, document, data);
		    })
		}
	    })
	}
    },
    
    /* follow a url found in given element(s) */
    follow: function(context, data) {
	var selector = this.args[0];
	var next = this.args[1];
        var self = this;
        var res = context.find(selector);
        
        if (res === undefined || res.length === 0) {
            this.debug('no results for '+selector);
	    self.next.start(null);
        }else{
            res.forEach(function(el) {
		if (selector.indexOf('@') !== -1)
		    var val = el.value()
		else
                    var val = getURL(el);
                if (val !== null) {
                    var url = URL.resolve(context.doc().url, val);
                    if (!url) return;
                    self.log("url: "+url)
                    self.request('get', url, function(document) {
                        self.next.start(document, data);
                    })
                }
            });
        }
	
        if (next === undefined) return;
	if (typeof next === 'function') {
	    next.call(this, context, data, function(c, d) { self.start.call(self, c, d||data) });
	}else{
	    var res = context.find(next, true);
	    self.log('found '+res.length+' results for "'+next+'"'+' in '+context.doc().url)
	    res.forEach(function(el) {
		var val = getURL(el);
		if (val !== null) {
		    self.log('next page is '+val)
		    var url = URL.resolve(context.doc().url, val);
		    if (url == context.doc().url) return;
		    self.request('get', url, function(document) {
			self.start.call(self, document, data);
		    })
		}
	    })
	}
    },
    
    /* set values */

    set: function(context, data) {
	var obj = this.args[0];
	var opts = this.args[1];
        for (var key in obj) {
            if (obj[key] === null) {
                data[key] = getContent(context);
            }else{
                var selector = obj[key].selector;
                if (obj[key].type === 's') { // string
                    var el = context.get(selector);
                    if (el === undefined) {
                        //this.debug('no data for '+selector)
                    }else{
                        data[key] = getContent(el);
                    }
                }else if (obj[key].type === 'a') { // array
                    var els = context.find(selector);
                    if (els === undefined || els.length === 0) {
                        //this.debug('no data for '+selector)
                    }else{ 
                        data[key] = [];
                        els.forEach(function(el) {
                            data[key].push(getContent(el));
                        });
                        if (data[key].length === 0)
                            delete data[key];
                    }
                }
		// this.data[key].length === 0
		// empty == not found?
		if ((data[key] === undefined) && obj[key].required === true) {
		    this.debug(key+' not found in '+context.doc().url);
		    this.next.start(null);
		    return;
		}
            }
            if (typeof data[key] === 'string')
                data[key] = data[key].trim();
            //this.debug(key+' = '+(this.data[key])+' ('+this.data.url+')');
        }
        this.next.start(context, data);
    },
    
    get: function(context, data) {
	var self = this;
	var url = this.args[0];
	if (context !== undefined)
	    url = URL.resolve(context.doc().url, url);
	this.request(this.name, url, this.args[1], function(c) { self.next.start(c, data) }, this.args[2]);
    },
    
    post: this.get
}

function getContent(el) {
    if (el.text !== undefined)
        return el.text().trim();
    else if (el.value !== undefined)
        return el.value().trim();
    return undefined;
}

var urlAttrs = ['href', 'src', 'value', 'link', 'rel'];
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

/*

    process argument order for speed

*/

promises.set.preloader = function(args) {
    /*
	convert set("key", "selector", {opts})
        to set({ "key" : "selector" }, {opts})
    */
    if (typeof args[0] === 'string' && (args[1] === undefined || typeof args[1] === 'string')) {
        var obj = {};
        obj[args[0]] = args[1]||null;
        args[0] = obj;
        if (typeof args[2] === 'object')
            args[1] = args.pop();
    }
    
    /* process selectors */
    for (var key in args[0]) {
        var selector = args[0][key];
        if (selector !== null) {
	    var type = 's'; // string
	    if (key.substr(key.length-2, 2) === '[]') {
		delete args[0][key];
		key = key.substr(0, key.length-2);
		type = 'a' // array
	    }
            args[0][key] = { type: type };
	    
            if (selector.charAt(0) === '!') {
                selector = selector.substr(1);
                args[0][key].required = true;
            }else{
                args[0][key].required = false;
	    }
            args[0][key].selector = selector;
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

function extend(obj1, obj2, replace) {
    for (i in obj2) {
        if ((replace === false && obj1[i] !== undefined)) continue;
        obj1[i] = obj2[i];
    }
    return obj1;
}

module.exports = promises;