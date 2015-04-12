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
		this.depth = this.depth||0;
		parser.queue[parser.queue.length] = [];
		if (parser.queue.length <= this.depth) {
			parser.queue.length = this.depth+1;
		}
		var args = [];
		for (var i = 0; arguments[i] !== undefined; i++) {
		    args.push(arguments[i]);
		}
		if (typeof cb.preloader === 'function') {
			args = cb.preloader.call(this, args);
		}
		
		/*
		 * When `depth` is 0 that means we're on a new Osmosis instance
		 */
		if (this.depth == 0) {
			
			/*
			 * If a new instance is found while parsing the current command chain
			 * then create and return a new Promise, otherwise the current
			 * `this` values will be overwritten by the next instance.
			 * 
			 * Deep object creation such as .set({ key: osmosis.find()... })
			 * requires a new Promise to be created, so that the previous
			 * command chain Promises don't have their values overwritten.
			 *
			 * so if (count > 0), we're still on an unfinished command chain
			 */
			if (instanceCommands > 0) {
				var p = new Promise();
				p.depth = 0;
				p.instance = ++instances;
				p.next = new Promise();
				p.next.instance = p.instance;
				p.next.depth = 1;
				p.next.prev = p
				p.name = name;
				p.cb = cb;
				p.args = args;
				p.stackPending = false;
				return p.next;
			}else{
				this.instance = ++instances;
			}
		}
		this.name = name;
		this.cb = cb;
		this.next = new Promise();
		this.next.instance = this.instance;
		this.next.depth = this.depth+1;
		this.next.prev = this;
		this.args = args;
		this.stackPending = false;
		
		if (typeof this.initialized === 'function') {
			this.initialized(this);
		}
		var self = this;
		if (self.prev && self.prev.depth === 0 &&
		   (self.prev.name === 'get' ||
		    self.prev.name === 'post' ||
		    self.prev.name === 'parse')) {
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
				self.prev.debug('starting instance '+self.prev.instance);
				self.prev.start();
				
				/*
				 * Reset the command chain size because every command
				 * in this instance is fully initialized.
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
		return this.next;
	})
}
var instances = 0;
var instanceCommands = 0;

var Promise = function(initialized) {
	if (typeof initialized === 'function') {
		this.initialized = initialized;
	}
	return this;
};

Promise.prototype.start = function(context, data) {
	if (this.stackPending === true) {
		parser.stack--;
		this.stackPending = false;
	}
	if (context === null || this.next === undefined)
	    return;
	if (context === undefined && this.depth !== 0) {
		this.error('no context');
	}else if (this.cb !== undefined) {
		if (this.next.stackPending === false) {
			parser.stack++;
			this.next.stackPending = true;
		}
		this.cb(context, extend({}, data));
	}
}

Promise.prototype.dom = function(context) {
	return new dom(context);
}

Promise.prototype.request = function(method, url, params, cb, opts) {
	if (typeof params === 'function') {
		cb = params;
		params = null;
	}
	opts = opts||{};
	if (cb.length === 3) {
		opts.parse = false;
	}
	var self = this;
	parser.request(this.depth, method, url, params, function(err, document, data) {
		if (opts !== undefined && opts.parse === false) {
			cb(err, document, data);
		}else{
			if (err !== null) {
				if (cb.length === 1)
					self.error(err);
				else
					cb(err, null);
			}else{
				self.log('loaded ['+method+'] '+url+' '+(params?JSON.stringify(params):''))
				if (cb.length === 1)
					cb(document);
				else
					cb(null, document);
				document = null;
			}
		}
		parser.stack--;
		if (parser.stack == 0 && self.next !== undefined && self.next.done !== undefined) {
			process.nextTick(function() {
				self.next.done();
			});
		}
	}, opts)
}

Promise.prototype.config = function(key, val) {
	if (key === undefined)
		return parser.opts;
	if (typeof key === 'object') {
		extend(parser.opts, key, true);
	}else{
		parser.opts[key] = val;
	}
	parser.needle.defaults(parser.opts);
	return this;
}

Promise.prototype.parse = function(data) {
	if (this.next === undefined)
		this.next = new Promise();
	var self = this;
	process.nextTick(function() {
		self.next.start(parser.parse(data), {});
	})
	return this.next;
}

Promise.prototype.done = function(cb) {
	if (typeof cb === 'function') {
		this.done = cb;
	}else if (this.next !== undefined) {
		this.next.done();
	}
	return this;
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
		parser.logging = true;
		this.logNext = cb;
	}else if (parser.logging === true) {
		this.logNext('('+this.name+') '+cb);
	}
	return this;
}

Promise.prototype.debug = function(cb) {
	if (typeof cb === 'function') {
		parser.debugging = true;
		this.debugNext = cb;
	}else if (parser.debugging === true) {
		this.debugNext('('+this.name+') '+cb);
	}
	return this;
}

Promise.prototype.error = function(cb) {
	if (typeof cb === 'function') {
		parser.errors = true;
		this.errorNext = cb;
	}else if (parser.errors === true) {
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

var dom = null;
var parser = null;
module.exports = function(p) {
	parser = p;
	parser.errors = false;
	parser.logging = false;
	parser.debugging = false;
	dom = require('./dom.js')(parser);
	return Promise;
}

/*
 * -- Example: How `osmosis.get('example.com')` Works Internally (basically)
 *
 *	-- This is the "actual" `.get()` function:
 *	
 *		var actualHttpGET = function(url, [data], callback) {
 *			...
 *		}
 *
 *	-- Set the `.get()` command using createPromise:
 *
 * 		Promise.prototype.get = createPromise('get', actualHttpGET);
 *
 *	-- Now `.get()` is a function. It essentially looks like this:
 *
 * 		Promise.prototype.get === function() {
 *			this.name	 = name	(from createPromise);
 *			this.callback	 = cb	(from createPromise);
 *			
 *			this.args	 = Function.arguments;
 *			
 *			this.next	 = new Promise();
 *			this.next.depth	 = this.depth+1;
 *			
 *			return this.next;
 *			
 *			Note: every chained command is just a reference to the
 *			      previously chained command's `this.next` value
 * 		}
 *
 *	-- In the background, the `osmosis` object is really just a Promise, so it inherits .get, .set, etc.
 *	
 *		var osmosis = new Promise();
 *
 *	-- Calling `osmosis.get()` is the same thing as calling the `Promise.prototype.get()` function
 *	
 *		var promise1 = osmosis.get('example.com')
 *
 *	-- Command chaining can be broken down like this:
 *	
 *		var promise2 = promise1.find('a');
 *		^
 *		|--------------|
 *		               v
 *		var promise3 = promise2.set('link')
 *		^
 *		|--------------|
 *		               v
 *		var promise4 = promise3.follow('@href');
 *		^
 *		|
 *		v
 *		promise4.done(fn)
 *		
 * 	
 */