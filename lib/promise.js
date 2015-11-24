function createPromise(name, cb) {
	return (function() {
		var self = this;
		if (this.prev === undefined) {
			self = new Promise();
		}

		self.depth = self.depth||0;

		var args = [];
		for (var i = 0; arguments[i] !== undefined; i++)
		    args.push(arguments[i]);

		if (typeof cb.preloader === 'function')
			args = cb.preloader.call(self, args);

		self.name = name;
		self.cb = cb;
		self.next = new Promise();
		self.next.depth = self.depth+1;
		self.next.prev = self;
		self.args = args;

		if (typeof self.initialized === 'function') {
			self.initialized(self);
		}

		var prev = self.prev;
		if (prev !== undefined) {
			if (prev.prev === undefined) {
				process.nextTick(function() {
					if (prev.prev !== undefined)
						return;
					if (prev.instance === undefined)
						prev.instance = new Parser(prev);
					prev.debug('starting');
					prev.start();
				})
			}
		}
		return self.next;
	})
}

var Data = function(data, parent, index, done) {
	this.obj = data||{};
	this.refs = 0;
	this.clones = 0;
	this.index = index;
	this.done = done;
	this.parent = parent;
	this.isArray = Array.isArray(data);
	return this;
}
Data.prototype = {
	get root() {
		var data = this;
		while (data.parent !== undefined) {
			data = data.parent;
		}
		return data;
	},
	clone: function() {
		data = {};
		for (key in this.obj) {
			data[key] = this.obj[key];
		}
		var d = new Data(data, this.parent, this.index, this.done)
		if (++this.clones > 1)
			d.ref();
		return d;
	},
	unref: function() {
		var data = this;
		while (data.parent !== undefined) {
			data = data.parent;
			data.refs--;
		}
	},
	ref: function() {
		var data = this;
		while (data.parent !== undefined) {
			data = data.parent;
			data.refs++;
		}
		if (!this.parent) return;
		return this.parent.refs;
	},
	next: function(obj, index, done) {
		var d = new Data(obj, this, index, done);
		d.ref();
		return d;
	},
}

var Promise = function(initialized) {
	if (typeof initialized === 'function') {
		this.initialized = initialized;
	}
	return this;
};

Object.defineProperties(Promise.prototype, {
	instance: {
		get: function() {
			return this._instance||(this.prev?this.prev.instance:undefined);
		},
		set: function(val) {
			this._instance = val;
		}
	}
})

Promise.prototype.isPromise = true;
Promise.prototype.new = function() {
	return new Promise();
}

Promise.prototype.getOpts = function(nested) {
	if (this.opts === undefined) {
		var proto;
		if (this.prev !== undefined) {
			proto = this.prev.getOpts(true);
		}else if (this.instance !== undefined) {
			proto = this.instance.opts;
		}
		if (proto === undefined) {
			if (nested === true)
				return undefined;
			if (this.tmp_opts === undefined)
				this.tmp_opts = {};
			return this.tmp_opts;
		}
		var obj = function() {};
		obj.prototype = proto;
		this.opts = new obj();
		if (this.tmp_opts !== undefined) {
			extend(this.opts, this.tmp_opts);
			this.tmp_opts = null;
		}
	}
	return this.opts;
}

Promise.prototype.start = function(context, data) {
	var self = this;
	if (!data)
		data = new Data();
	if (this.instance.paused === true) {
		self.instance.resume(function() {
			self.start(context, data);
		})
	}else if (this.cb !== undefined) {
		self.instance.stack.push();
		if (this.cb.length === 4) {
			var calledNext = false;
			data.ref();
			this.cb(context, data.clone(), function(c, d) { calledNext = true; self.next.start(c, d) }, function() {
				data.unref();
				// `done` was called, but `next` wasn't
				if (calledNext === false && data.done) {
					data.unref();
					data.done();
				}
				self.instance.stack.pop();
			});
		}else{
			this.cb(context, data.clone(), function(c, d) { self.next.start(c, d) });
			self.instance.stack.pop();
		}
	}else if (this.next !== undefined) {
		this.next.start(context, data);
	}
}

Promise.prototype.setChildData = function(context, data, next) {
	if (data.parent !== undefined) {
		var parent = data.parent;
		if (parent.obj[data.index] === undefined) {
			parent.obj[data.index] = data.obj;
		}else if (Array.isArray(parent.obj[data.index])) {
			parent.obj[data.index].push(data.obj);
		}else{
			parent.obj[data.index] = [parent.obj[data.index], data.obj];
		}
	}
	process.nextTick(function() {
		data.unref();
		if (data.done !== undefined)
			data.done();
	})
}

Promise.prototype.request = function(method, url, params, cb, opts) {
	if (typeof params === 'function') {
		cb = params;
		params = null;
	}
	opts = opts||{};
	if (cb.length === 3)
		opts.parse = false;
	var opts = this.config();
	if (opts.hasOwnProperty('rewrite')) {
		url = opts.rewrite(url);
		if (!url) return;
	}
	var self = this;
	this.instance.request(method, url, params, function(err, res, document) {
		if (err !== null) {
			self.error((self.name!==method?'[' + method + '] ':'') + url + ' - ' + err);
			if (cb.length === 2)
				cb(err, document);
			else if (cb.length === 3)
				cb(err, res, document)
		}else{
			self.log('loaded ['+method+'] '+url+' '+(params?JSON.stringify(params):''))
			if (cb.length === 1)
				cb(document);
			else if (cb.length === 2)
				cb(null, document);
			else
				cb(null, res, document)
			document = null;
		}
		self.instance.stack.pop();
	}, opts)
}

Promise.prototype.done = function(cb) {
	if (typeof cb === 'function') {
		this.done = cb;
	}else if (this.next !== undefined) {
		this.next.done();
	}
	return this;
}

Promise.prototype.config = function(key, val) {
	var self = this;
	if (self.name === undefined && self.prev !== undefined)
		self = self.prev;
	var opts = self.getOpts();
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

Promise.prototype.header = function(key, val) {
	var obj = {};
	obj[key] = val;
	this.headers(obj)
	return this;
}

Promise.prototype.headers = function(obj) {
	var opts = this.config();
	if (opts.headers === undefined)
		opts.headers = {};
	extend(opts.headers, obj)
	return this;
}

Promise.prototype.rewrite = function(cb) {
	opts = this.config('rewrite', cb);
	return this;
}

Promise.prototype.pause = function() {
	this.instance.stack.push();
	this.prev.debug('pausing');
	this.instance.paused = true;
}

Promise.prototype.resume = function() {
	this.instance.stack.pop();
	var instance = this.instance;
	this.prev.debug('resuming');
	this.instance.paused = false;
	this.instance.resume();
	this.instance.requestQueue();
}

Promise.prototype.stop = function() {
	this.instance.stack.pop();
	this.pause();
	this.debugNext("stopping");
	//this.instance.stack.count -= this.instance.queue.length;
	this.instance.paused = true;
	//this.instance.queue = [];
}

Promise.prototype.logNext = function(msg) {
	if (this.next !== undefined)
		this.next.logNext(msg);
}

Promise.prototype.debugNext = function(msg) {
	if (this.next !== undefined)
		this.next.debugNext(msg);
}

Promise.prototype.errorNext = function(msg) {
	if (this.next !== undefined)
		this.next.errorNext(msg);
}

Promise.prototype.log = function(cb) {
	if (typeof cb === 'function') {
		this.logNext = cb;
	}else{
		this.logNext('('+this.name+') '+cb);
	}
	return this;
}

Promise.prototype.debug = function(cb) {
	if (typeof cb === 'function') {
		this.config('debug', true);
		this.debugNext = cb;
	}else{
		this.debugNext('('+this.name+') '+cb);
	}
	return this;
}

Promise.prototype.error = function(cb) {
	if (typeof cb === 'function') {
		this.errorNext = cb;
	}else{
		this.errorNext('('+this.name+') '+cb);
	}
	return this;
}

var extend = function(obj1, obj2, replace) {
    for (i in obj2) {
        if (replace === false && obj1[i] !== undefined) continue;
        obj1[i] = obj2[i];
    }
    return obj1;
}

var promises = require('./promises.js');
for (var name in promises) {
	Promise.prototype[name] = createPromise(name, promises[name]);
}

var Parser = null;
module.exports = function(p) {
	Parser = p;
	return Promise;
}
