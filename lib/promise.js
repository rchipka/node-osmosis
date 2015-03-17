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
	//console.log("NEXT "+this.name+' '+(context.root!==undefined?context.root().name():context.name()+' '+context.content().substr(0, 20)));
	if (context === null || this.next === undefined)
	    return;
	if (context === undefined) {
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

Promise.prototype.request = function(method, url, data, cb, opts) {
	if (typeof data === 'function') {
		cb = data;
		data = null;
	}
	var self = this;
	parser.request(this.depth, method, url, data, function(err, document) {
		if (err !== null) {
			if (cb.length === 1)
				self.error(err);
			else
				cb(err, null);
		}else{
			self.log('loaded ['+method+'] '+url+' '+(data?JSON.stringify(data):''))
			if (cb.length === 1)
				cb(document);
			else
				cb(null, document);
			document = null;
		}
		parser.stack--;
		if (parser.stack == 0 && self.next !== undefined && self.next.done !== undefined) {
			parser.resources();
			self.next.done();
		}
	})
}

Promise.prototype.config = function(opts) {
	extend(parser.opts, opts, true)
	return this;
}

Promise.prototype.parse = function(data) {
	return new Promise(function(p) {
		this.next(parser.parse(data));
	});
}

Promise.prototype.get = function(url, data, opts) {
	return this.next = new Promise(function() {
		var self = this;
		self.request('get', url, data, function(c) { self.start(c) }, opts)
		//parser.stack--;
	});
}

Promise.prototype.post = function(url, data, opts) {
	var self = this;
	return this.next = new Promise(function() {
		self.request('post', url, data, this.next, opts);
		//parser.stack--;
	})
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
	this.next.logNext(msg);
}

Promise.prototype.debugNext = function(msg) {
	this.next.debugNext(msg);
}

Promise.prototype.errorNext = function(msg) {
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