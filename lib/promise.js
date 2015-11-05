/*
 * -- createPromise() --
 *
 *    Creates and returns a generic function for every Osmosis command.
 *
 * The generic function basically has three purposes:
 *
 *  1. Get any arguments that the function was called with
 *     ('http://example.com', )
 *
 *  2. Store the name, arguments, and callback
 *     (so they can be referred to and called by the previous command)
 *
 *  3. Return a new Promise
 *     (which allows the current promise to call the next one, enabling command chaining)
 *
 * Every generic command function inhereits two unique values:
 *
 *  1. The name of the command being created
 *
 *  2. The callback of the command being created
 *
 */

function createPromise(name, cb) {
	return (function() {
		var self = this;
		if (this.prev === undefined) {
			self = new Promise();
		}
		self.depth = self.depth||0;
		var args = [];
		for (var i = 0; arguments[i] !== undefined; i++) {
		    args.push(arguments[i]);
		}
		if (typeof cb.preloader === 'function') {
			args = cb.preloader.call(self, args);
		}

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
		if (prev !== undefined && prev.depth === 0) {
			/*
			 * -- Starting functions --
			 *
			 * Here we've got "starting functions" (get, post, parse)
			 * If the depth is 0 (new Osmosis instance), then we'll start the command chain.
			 */
			process.nextTick(function() {
				/*
				* If the depth has changed from 0 since we last checked
				* then return and don't start the command
				*/
				if (self.depth !== 1 || self.prev.depth !== 0)
					return;

				/*
				* If it's a new instance, start the first command
				*/
				if (prev.instance === undefined) {
					prev.instance = new Parser(prev);
				}
				prev.debug('starting');
				prev.start();

				/*
				* Reset the command chain size because every command
				* in this instance is fully initialized.3
				*/
				instanceCommands = 0;
			})
			/*
			 * -- Why use "process.nextTick"? --
			 *
			 * We use process.nextTick because we want this to happen after every
			 * command in the current command chain is already initialized.
			 *
			 * This gives us an opportunity to modify values before
			 * starting the first "starting function".
			 *
			 *
			 * -- Modifying `depth` value --
			 *
			 * The depth of the "starting function" is definitely "0" right now,
			 * however, it could have increased since the Osmosis instance returned.
			 *
			 * Increasing the depth of a "starting function" does two things:
			 *  1. Increases the priority of that Osmosis instance's HTTP requests
			 *  2. Stops the current Osmosis instance from running automatically
			 *
			 * Currently, the only time a "starting function's" depth is changed
			 * is when an Osmosis object is created while using `.set()`.
			 *
			 * For example:
			 *
			 *	osmosis
			 *	...
			 * 	.set({
			 * 		comments: [ osmosis.get('/comments') ]
			 * 	})
			 *
			 * We don't want osmosis.get('/posts') to start automatically,
			 * instead we want to start it manually during `.set()`.
			 *
			 */
		}
		instanceCommands++;
		return self.next;
	})
}
var instances = 0;
var instanceCommands = 0;

var Data = function(data, parent, index, done) {
	this.obj = data||{};
	this.refs = 0;
	this.clones = 0;
	this.index = index;
	this.done = done;
	if (parent) {
	this.parent = parent;
	//this.refs = parent.refs;
	}
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
	refCount: 0,
	clone: function() {
		//if (this.refs > 0)
		//	return this;
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
		totalRefs--;
		var data = this;
		while (data.parent !== undefined) {
			data = data.parent;
			data.refs--;
		}
	},
	ref: function() {
		totalRefs++;
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

var totalRefs = 0;
var Promise = function(initialized) {
	if (typeof initialized === 'function') {
		this.initialized = initialized;
	}
	return this;
};

Object.defineProperty(Promise.prototype, 'instance', {
	get: function() {
		return this._instance||(this.prev?this.prev.instance:undefined);
	},
	set: function(val) {
		this._instance = val;
	}
})

Promise.prototype.isPromise = true;
Promise.prototype.new = function() {
	return new Promise();
}

Promise.prototype.start = function(context, data) {
	var self = this;
	if (!data)
		data = new Data();
	if (this.instance.paused === true) {
		self.instance.resume(function() {
			self.start(context, data);
		})
		return;
	}else if (context === undefined && this.depth !== 0) {
		this.error('no context');
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
		//this.error(err.stack);
	}
}

Promise.prototype.setChildData = function(context, data, next) {
	if (data.parent === undefined)
		return;
	var parent = data.parent;
	if (parent.obj[data.index] === undefined) {
		parent.obj[data.index] = data.obj;
	}else if (Array.isArray(parent.obj[data.index])) {
		parent.obj[data.index].push(data.obj);
	}else{
		parent.obj[data.index] = [parent.obj[data.index], data.obj];
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
	var self = this;
	this.instance.request(method, url, params, function(err, res, document) {
		if (err !== null) {
			if (cb.length === 1)
				self.error(err);
			else if (cb.length === 2)
				cb(err, document);
			else
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

Promise.prototype.config = function(key, val) {
	if (this.instance === undefined)
		this.instance = new Parser(this)
	if (key === undefined)
		return this.instance.opts;
	if (typeof key === 'object') {
		extend(this.instance.opts, key, true);
	}else if (typeof key === 'function') {
		key(this.instance.opts);
	}else{
		this.instance.opts[key] = val;
	}
	return this;
}

Promise.prototype.done = function(cb) {
	if (typeof cb === 'function') {
		this.done = cb;
	}else if (this.next !== undefined) {
		this.next.done();
	}
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
        if ((replace === false && obj1[i] !== undefined) || (typeof obj2[i]).charAt(0) === 'f') continue;
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
