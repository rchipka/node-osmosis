var util = require('util');
var URL  = require('url');

var promises = {
    then: function(context, data) {
        var self = this;
	try {
	    this.args[0].call(self, context, data, function(c, d) { self.next.start(c||context, d||data) });
	}catch(err) {
	    this.error(err.stack);
	}
    },
    data: function(context, data) {
        this.args[0].call(this, data);
        this.next.start(context, data);
    },
    doc: function(context, data) {
	this.next.start(context.doc(), data);
    },
    
    /* find elements based on css or xpath selector */
    
    find: function(context, data) {
	var selector = this.args[0];
	var next = this.args[1];
        var self = this;
        var res = context.find(selector);
	var url = '';
	if (context.doc().request !== undefined)
	    url = context.doc().request.url;
	else if ((typeof context.name).charAt(0) === 'f')
	    url = context.name();
	else
	    url = context.doc().root().name();
	
        if (res.length < 1) {
            this.error('no results for "'+selector+'" in '+url);
            self.next.start(null);
	    return;
        }
        
        this.log('found '+res.length+' results for "'+selector+'"'+' in '+url)
        var i = 0;
        res.forEach(function(el, i) {
	    el.last = (res.length-1 == i);
	    self.next.start(el, data);
        });
        
        if (next === undefined) return;
	if (typeof next === 'function') {
	    next.call(this, context, data, function(c, d) { self.start.call(self, c, d||data) });
	}else{
	    var res = context.find(next);
	    self.log('found '+res.length+' results for "'+next+'"'+' in '+url)
	    res.forEach(function(el) {
		var val = getURL(el);
		if (val !== null) {
		    self.log('next page is '+val);
		    if (context.doc().request !== undefined) {
			var url = URL.resolve(context.doc().request.url, val);
			if (url == context.doc().request.url) return;
		    }
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
                    var url = URL.resolve(context.doc().request.url, val);
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
	    var res = context.find(next);
	    self.log('found '+res.length+' results for "'+next+'"'+' in '+context.doc().request.url)
	    res.forEach(function(el) {
		var val = getURL(el);
		if (val !== null) {
		    self.log('next page is '+val)
		    var url = URL.resolve(context.doc().request.url, val);
		    if (url == context.doc().request.url) return;
		    self.request('get', url, function(document) {
			self.start.call(self, document, data);
		    })
		}
	    })
	}
    },
    
    /* set values */

    set: function(context, data, dataPath, next) {
	var self = this;
    	var obj = this.args;
	var path = data;
	dataPath = dataPath||this.dataPath||[];
	dataPath.forEach(function(d, i) {
	    if (obj[d] !== undefined && !self.isNestedPromise)
	    	obj = obj[d];
	    path = path[d];
	});
	var keys = Object.keys(obj);
	var isArray = util.isArray(path);
	var tmp = {};
	
	keys.forEach(function(key, i) {
	    if (path[key] !== undefined) return;
	    var val = obj[key];
	    if ((typeof val).charAt(0) === 'o' && val !== null) return;
	    if (val === null) {
		tmp[key] = getContent(context);
	    }else{
		if (isArray && keys.length === 1) {
		    context.find(val).forEach(function(el) {
			var content = getContent(el);
			if (content.length !== 0)
			path.push(content);
		    })
		}else{
		    tmp[key] = getContent(context.get(val));
		}
	    }
	})
	if (Object.keys(tmp).length !== 0) {
	    if (isArray) {
		path.push(tmp);
	    }else{
		path = extend(path, tmp);
	    }
	}
	
	if (!keys.some(function(key, i) {
	    var val = obj[key];
	    if (path[key] !== undefined || (typeof val).charAt(0) !== 'o') return false;
	    if (util.isArray(val)) {
		path[key] = [];
		dataPath.push(key);
		self.cb(context, data, dataPath, self);
		return true;
	    }else if (val !== null) {
		if (!isArray)
		path[key] = {};
		if (val.isNestedPromise === true) {
		    data.__prev = context;
		    val.start(context, data);
		}else{
		    dataPath.push(key)
		    self.cb(context, data, dataPath, self);
		}
		return true;
	    }
	    return false;
        })) {
	    if (context.last === undefined || !isArray || (isArray && context.last === true)) {
		if ((next||this.next).isNestedPromise !== true && this.isNestedPromise === true)
		    context = data.__prev;
		else if (data.__prev)
		    delete data.__prev;
		if (next === undefined) {
		    this.next.start(context, data);
		}else{
		    next.start(context, data);
		}
	    }
	}
    },
    
    get: function(context, data) {
	var self = this;
	var url		= this.args[0];
	var params	= this.args[1];
	var opts	= this.args[2];
	var callback	= this.args[3];
	if (url === undefined) {
	    this.error('no url found');
	    return;
	}
	if (context !== undefined)
	    url = URL.resolve(context.doc().request.url, url);
	if (callback !== undefined) {
	    var cb = function(c) {
		callback.call(self, c, data, function(nc, nd) {
		    self.next.start(nc||c, nd||data)
		});
	    }
	}else{
	    var cb = function(c) {
		self.next.start(c, data)
	    };
	}
	this.request(this.name, url, this.args[1], cb, this.args[2]);
    },
    
    login: function(context, data) {
	var user	= this.args[0];
	var pass	= this.args[1];
	var fail	= this.args[2];
	var params	= {};
	var form	= context.get('form:has(input[type="password"])')
	
	if (form === null) {
	    this.error('No login form found');
	    return;
	}
	
	var userInput	= form.get('input:before(input[type="password"]):last');
	var passInput	= form.get('input[type="password"]');
	
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
	
	var url = URL.resolve(context.doc().request.url, form.attr('action')||context.doc().request.url);
	var method = (form.attr('method')||'get').toLowerCase();
	this.debug(method+' '+url+' '+JSON.stringify(params));
	var self = this;
	this.request(method, url, params, function(c) {
	    if (typeof fail === 'string') {
		if (c.find(fail).length !== 0) {
		    self.error('failed');
		    return;
		}
	    }
	    self.next.start(c, data);
	});
    }
}
promises.post = promises.get;

function getContent(el) {
    if (el === undefined) return undefined;
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
    return val||getContent(el);
}

function isURL(s) {
    return (s !== null && s !== undefined && (s.charAt(0) === '/' || s.substr(0,4) === 'http'))
}

/*
 * process argument order for speed
 *
 */

var dataPath = [];
promises.set.preloader = function(args) {
    var self = this;
    var key = args[0];
    var val = args[1];
    var obj = {};
    
    /*
     * set("key", "val") => set({ "key" : "val" })
     */
    if (typeof key === 'string' && (val === undefined || typeof val === 'string')) {
	obj[key] = val||null;
        return obj;
    }
    
    var obj = key;
    
    Object.keys(obj).forEach(function(key) {
	var val = obj[key];
	if (val === null) return;
	var notArrayKey = key.match(/^[0-9]+$/)===null;
	if (notArrayKey)
	dataPath.push(key);
	
	var type = typeof val;
	if (type === 'string') {
	    if (key.substr(key.length-2, 2) === '[]' || val.substr(val.length-2, 2) === '[]') {
		delete obj[key];
		obj[key.replace('[]', '')] = [val.replace('[]', '')];
	    }
	}
	
	if (util.isArray(val)) {
	    obj[key] = promises.set.preloader.call(self, [val]);
	}else if (type === 'object') {
	    if (val.prev !== undefined && val.depth !== undefined) {
		/*
		 * If `val` is a Promise
		 *
		 * `val` is the last returned promise from the Osmosis instance,
		 * so we'll loop through it backwards and update the depths
		 * to be greater than the current `set` depth.
		 *
		 */
		var promise = val.prev;
		promise.next = self;
		
		for (var i = promise.depth; i--;) {
		    if (dataPath !== null && promise.name === 'set')
			promise.dataPath = dataPath.slice(0);
		    promise.depth = self.depth+i;
		    promise.isNestedPromise = true;
		    promise = promise.prev
		}
		
		// We now have the first Promise/command for the instance
		promise.isNestedPromise = true;
		promise.depth = self.depth;
		obj[key] = promise;
	    }else
		obj[key] = promises.set.preloader.call(self, [val]);
	}
	if (notArrayKey)
	dataPath.pop();
    })
    //console.log('new obj', util.inspect(obj, {depth:2}));
    return obj;
}

promises.get.preloader,
promises.post.preloader = function(args) {
    for (var i = 0; i < 3; i++) {
	if (typeof args[i] === 'function') {
	    args[3] = args[i];
	    args[i] = null;
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