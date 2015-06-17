var util = require('util');
var URL  = require('url');

var promises = {
    
    data: function(context, data) {
	if (typeof this.args[0] === 'function') {
	    this.args[0].call(this, data);
	    this.next.start(context, data);
	}else if (this.args[0] === null) {
	    this.next.start(context, {});
	}else{
	    this.next.start(context, extend(data, this.args[0], true));
	}
	this.free(data);
    },
    
    doc: function(context, data) {
	this.next.start(context.doc(), data);
    },
    
    find: function(context, data) {
	var selector = this.args[0];
	var next = this.args[1];
        var self = this;
	if (this.instance > this.prev.instance)
	    var res = context.find(selector);
	else
	    var res = context.doc().find(selector);
	var url = '';
	if (context.doc().request !== undefined)
	    url = context.doc().request.url;
	if ((typeof context.name).charAt(0) === 'f')
	    url += ' ('+context.path()+')';
	else
	    url += ' ('+context.doc().root().path()+')';
	
        if (res.length < 1) {
            this.error('no results for "'+selector+'" in '+url);
            self.next.start(null);
	    return;
        }
        
        this.log('found '+res.length+' results for "'+selector+'"'+' in '+url)
        var i = 0;
        res.forEach(function(el, i) {
	    el.last = (res.length-1 == i);
	    el.index = i;
	    self.next.start(el, data);
        });
	this.free(data);
        
        if (next === undefined) return;
	if (typeof next === 'function') {
	    next = next.call(this, context, data, function(c, d) { self.start.call(self, c, d||data) });
	}
	if (typeof next === 'string') {
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
    
    follow: function(context, data) {
	var selector = this.args[0];
	var next = this.args[1];
        var self = this;
        var res = context.find(selector, null, this.isNestedPromise);
	console.log(this.isNestedPromise, res.xpath, selector);
        
        if (res === undefined || res.length === 0) {
            this.debug('no results for '+selector);
	    self.next.start(null);
        }else{
            res.forEach(function(el, i) {
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
			if (res.length-1 == i)
			    self.free(data);
                    })
                }
            });
        }
	
	
        if (next === undefined)
	    return;
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
		self.free(data);
		callback.call(self, c, data, function(nc, nd) {
		    self.next.start(nc||c, nd||data)
		});
	    }
	}else{
	    var cb = function(c) {
		self.free(data);
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
    },
    
    page: function(context, data) {
	var selector = this.args[0];
	
	var res = context.find(next);
	self.log('found '+res.length+' results for "'+selector+'"')
    },
    
    set: function(context, data, args, next) {
	var self = this;
    	args = args||this.args;
	next = next||this.next;
	var ref = data.__ref !== undefined;
	if (ref) {
	    var ref = data.__ref;
	    delete data.__ref;
	    data = extend(ref, data);
	}
	var orig = data.__orig;
	if (orig !== undefined && orig.__root !== undefined) {
	    var root = orig.__root;
	}else{
	    var isRoot = true;
	    var root = data;
	}
	root.__instances = root.__instances||0;
	    data.__root = root;
	
	var keys = Object.keys(args);
	var tmp = {};
	
	var count = 0;
	keys.forEach(function(key, i) {
	    if (data[key] !== undefined) return;
	    var val = args[key];
	    if (val !== null && typeof val === 'object') return;
	    count++;
	    if (val === null) {
		data[key] = getContent(context);
	    }else if (val !== undefined) {
		data[key] = getContent(context.get(val));
	    }
	})
	
	if (keys.some(function(key, i) {
	    if (data[key] !== undefined && !Array.isArray(data[key])) return false;
	    var val = args[key];
	    if (val === null || typeof val !== 'object') return false;
	    count++;
	    if (val.isNestedPromise === true) {
		data.__orig = orig;
		data.__root = root;
		data[key] = { __orig:data };
		val.start(context, { __ref:data[key], __orig:data });
		return true;
	    }else if (Array.isArray(val)) {
		if (val.length === 0) return false;
		if (data[key] === undefined)
		    data[key] = [];
		var loopArray = function(arr, d) {
		    while (arr.length > 0) {
			var v = arr.shift();
			if (typeof v === 'string') {
			    context.find(v).forEach(function(e) {
				d.push(getContent(e));
			    })
			}else if (v.isNestedPromise) {
			    data[key].__root = root;
			    d.__root = root;
			    d.__orig = data;
			    Object.defineProperties(d, { __root: { enumerable: false }, __orig: { enumerable: false } });
			    v.start(context, { __orig: d, __prev: context });
			    return;
			}else if (Array.isArray(v) && v.length > 0) {
			    loopArray(v, d[d.push([])-1]);
			    arr.unshift(v);
			    return;
			}else if (v !== null) {
			    data[key].__root = root;
			    d.__root = root;
			    d.__orig = data;
			    self.cb(context, { __orig: d, __prev: context }, args[v], self)
			    return;
			}
		    }
		}
		loopArray(val, data[key]);
		if (data[key].length === 0)
		return false;
	    }else{
		data[key] = { __orig: data };
		if (root.__instances !== undefined)
		    root.__instances++;
		self.cb(context, data[key], val, self);
		return true
	    }
	    return false;
	}) === false) {
	    console.log(this.name, Object.keys(args), "Array?", Array.isArray(data), "Found:", count, "Instances:", root.__instances);
	    
	    var arr = null;
	    delete data.__orig;
	    delete data.__root;
	    var prev = data.__prev;
	    if (prev !== undefined && next.instance < self.instance) {
		context = prev;
		delete data.__prev;
	    }
	    if (orig !== undefined) {
		//orig.__prev = data.__prev;
		if (Array.isArray(orig)) {
		    arr = orig;
		    orig.push(data);
		    data = orig;
		    orig = data.__orig;
		}
		data = orig;
		orig = data.__orig;
	    }
	    process.nextTick(function() {
		if (isRoot === true) {
		    if (root.__instances !== 0) return;
		    self.free(data);
		    delete data.__instances;
		    next.start(context, data)
		}else{
		    //console.log('calling next', data);
		    self.free(data);
		    next.cb(context, data);
		}
	    })
	}
    },
    
    submit: function(context, data) {
	var selector	= this.args[0];
	var params	= this.args[1];
	
	var form = context.get(selector);
	if (form === null) {
	    this.error(selector+' not found');
	    this.next.start(null);
	    return;
	}
	var action = form.attr('action')||context.doc().request.url;
	var method = form.attr('method')||'get';
	var inputs = context.find('[name]');
	inputs.forEach(function(input) {
	    console.log(input);
	})
    },
    
    then: function(context, data) {
        var self = this;
	try {
	    this.args[0].call(self, context, data, function(c, d) { self.next.start(c, d||data) });
	}catch(err) {
	    this.error(err.stack);
	}
    },
}
promises.paginate = promises.page;
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
    this.argsPath = [];
    this.dataPath = [];
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
		    if (promise.name === 'set') {
			//promise.dataPath = dataPath.slice(0);
		    }
		    promise.depth = self.depth+i;
		    promise.isNestedPromise = true;
		    promise = promise.prev
		}
		
		// We now have the first Promise/command for the instance
		promise.isNestedPromise = true;
		promise.depth = self.depth;
		promise.prev = self;
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
    /*
    var type = typeof args[0];
    if (type === 'string' || args[0] instanceof String) {
    
    }else if (type === 'object') {
        args[2] = args[0];
        args[0] = undefined;
        args[1] = undefined;
    }
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