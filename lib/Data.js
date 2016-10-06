/*jslint node: true */
'use strict';

/**
 * @constructor Data
 * @param {object} [data] - Data object value
 * @param {object} [parent] - Parent Data object
 * @param {object} [index] - Index in the parent object
 * @param {bool} [isArray] - Is the object an array?
 * @property {number} refs - Number of references
 * @property {number} clones - Number of clones
 * @property {object} object - Key/value data storage
 * @property {Data} parent - Parent Data object
 * @property {string} index - Key to set in the parent object
 * @private
 */

function Data(parent) {
    this.stack = { count: 0 };

    if (parent) {
        this.parent = parent;
    }

    return this;
}

/**
 * Create an empty child Data object for the parent.
 *
 */

Data.prototype.child = function () {
    return new Data(this);
};

/**
 * Clone a Data object.
 *
 */

Data.prototype.clone = function () {
    var clone    = this.next();

    clone.object = this.copy();

    return clone;
};

/**
 * Call callback when `Data.stack.count` === 0.
 */

Data.prototype.done = function (cb) {
    this.stack.done = cb;
    return this;
};

/**
 * Get the raw data object.
 *
 */

Data.prototype.getObject = function () {
    if (this.object === undefined) {
        if (this.isArray() === true) {
            this.toArray();
        } else {
            this.setObject({});
        }
    }

    return this.object;
};

/**
 * Set the raw data object.
 *
 */

Data.prototype.setObject = function (object) {
    this.object = object;

    return this;
};

/**
 * Create a new Data object to pass to the next Command.
 *
 */

Data.prototype.next = function () {
    var clone = new Data(this.parent)
                    .setIndex(this.getIndex())
                    .isArray(this.isArray());

    clone.stack  = this.stack;
    clone.object = this.object;
    return clone;
};

/**
 * Increase the reference count on all ancestors.
 *
 */

Data.prototype.ref = function () {
    this.stack.count++;
    return this;
};

/**
 * Decrease the reference count on all ancestors.
 *
 */

Data.prototype.unref = function () {
    if (--this.stack.count === 0) {
        if (this.stack.done !== undefined) {
            this.stack.done.call(this);
        }
    }
};

/**
 * Set a key/value in {@link Data.object}.
 *
 * @param {string|object} key - A key or { key: val } object
 * @param {any} val - A value
 */

Data.prototype.set = function (key, val) {
    var object, currentVal;

    if (val === undefined) {
        return this;
    }

    if (this.isArray() === true) {
        return this.push(val);
    }

    object     = this.getObject();
    currentVal = object[key];

    if (currentVal !== undefined) {
        // If the key being set already has a value,
        // then convert it to an Array.
        if (currentVal instanceof Array) {
            currentVal.push(val);
        } else {
            object[key] = [currentVal, val];
        }
    } else {
        object[key] = val;
    }

    return this;
};

/**
 * Push a value onto {@link Data.object} array.
 */

Data.prototype.push = function (val) {
    var object = this.toArray();

    if (val === undefined) {
        return this;
    }

    object.push(val);

    return this;
};

Data.prototype.copy = function () {
    var obj = this.object,
        data, i, keys, key;

    if (this.isArray()) {
        data = obj.slice(0);
    } else if (obj instanceof Object) {
        data = {};

        for (i = 0, keys = Object.keys(obj); i < keys.length; i++) {
            key = keys[i];
            data[key] = obj[key];
        }
    } else {
        data = obj;
    }

    return data;
};

Data.prototype.isArray = function (val) {
    if (val !== undefined) {
        this._isArray = val === true;
        return this;
    }

    return (this._isArray === true || this.object instanceof Array);
};

Data.prototype.isEmpty = function () {
    return (this.object === undefined ||
            (this.object instanceof Object &&
             Object.keys(this.object).length === 0)
            );
};

Data.prototype.getIndex = function () {
    return this._index;
};

Data.prototype.setIndex = function (index) {
    if (this.isArray() !== true) {
        this._index = index;
    }

    return this;
};

Data.prototype.merge = function (child) {
    var object = child.object,
        index  = child.getIndex();

    if (object === undefined) {
        return;
    }

    if (this.isArray() === true) {
        this.push(object);
    } else if (index !== undefined) {
        this.set(child.getIndex(), object);
    } else if (object instanceof Object) {
        this.extend(object);
    }
};

Data.prototype.toArray = function () {
    var object = this.object;

    if (object instanceof Array) {
        return object;
    }

    if (this.isEmpty()) {
        this.setObject([]);
    } else {
        this.setObject([ object ]);
    }

    return this.getObject();
};


Data.prototype.extend = function (object) {
    var key, keys = Object.keys(object),
        isArray = this.isArray(),
        i = keys.length;

    while (i--) {
        key = keys[i];

        if (isArray) {
            this.push(object[key]);
        } else {
            this.set(key, object[key]);
        }
    }

    return object;
};

module.exports = Data;
