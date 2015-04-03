var parser = null;

function createPromise(name, cb) {
	return (function() {
		parser.queue[parser.queue.length] = [];
		this.depth = parser.queue.length++;
		this.name = name;
		this.next = new Promise();
		this.cb = cb;
		
		var self = this;
		var args = [];
		for (var i = 0; arguments[i] !== undefined; i++) {
		    args.push(arguments[i]);
		}
		if (typeof cb.preloader === 'function')
			args = cb.preloader.call(this, args);
		this.args = args;
		
		if (typeof this.initialized === 'function') {
			this.initialized(this);
		}
		if (this.depth == 0) {
			this.log('Starting...');
			this.start();
		}
		return this.next;
	})
}

var Promise = function(initialized) {
	if (typeof initialized === 'function') {
		this.initialized = initialized;
	}
	return this;
};

Promise.prototype.start = function(context, data) {
	if (context === null || this.next === undefined)
	    return;
	if (context === undefined && this.depth !== 0) {
		this.error('no context');
	}else if (this.cb !== undefined) {
		parser.stack++;
		var newData = {};
		this.cb(context, extend(newData, data));
		context = null;
		parser.stack--;
	}else{
	
	}
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
			self.next.done();
		}
	}, opts)
}

Promise.prototype.config = function(key, val) {
	if (typeof key === 'object') {
		extend(parser.opts, key, true);
	}else{
		parser.opts[key] = val;
	}
	return this;
}

Promise.prototype.parse = function(data) {
	return new Promise(function(p) {
		this.next(parser.parse(data));
	});
}

Promise.prototype.done = function(cb) {
	if (typeof cb === 'function') {
		this.done = cb;
	}else{
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

module.exports = function(parse) {
	parser = parse;
	parser.errors = false;
	parser.logging = false;
	parser.debugging = false;
	return Promise;
}