/*jslint node: true */
'use strict';

var sourceSelectorRegexp    = /:source$/,
    innerHTMLSelectorRegexp = /:html$/;

/**
 * Set values in the {@link data} object.
 *
 * Note: Also accepts set(key, selector) as parameters
 *
 * @function set
 * @memberof Command
 * @param {object} data - Key/selector pairs to set.
 * @instance
 */

module.exports.set = function (key, val) {
    var args = key,
        isArray = args instanceof Array;

    if (val !== undefined) {
        args = {};
        args[key] = val;
    } else if (typeof key === 'string') {
        args = {};
        args[key] = null;
    }

    return setObject(loopObject(args, isArray), isArray);
};

function loopObject(obj) {
    var keys    = Object.keys(obj),
        length  = keys.length,
        isArray = obj instanceof Array,
        arr     = new Array(length * 3),
        i       = 0,
        ai      = 0,
        key, val, valIsArray, func, isObject;

    for (; i < length; i++) {
        key          = keys[i];
        val          = obj[key];
        valIsArray   = val instanceof Array;
        isObject     = false;

        if (typeof val === 'object' && val !== null) {
            isObject = true;

            if (val.isCommand === true) {
                func = setInstance(val, key);
            } else if (!valIsArray || val.length > 0) {
                func = setObject(loopObject(val), valIsArray, key);
            }
        } else {
            if (val === null) {
                func = setContextNull;
            } else if (typeof val === 'function') {
                func = setContextFunc(val);
            } else if (isArray) {
                func = setContextArray(val);
            } else if (sourceSelectorRegexp.test(val)) {
                func = setContextSource(val);
            } else if (innerHTMLSelectorRegexp.test(val)) {
                func = setContextInnerHTML(val);
            } else {
                func = setContextVal(val);
            }
        }

        arr[ai++] = key;
        arr[ai++] = func;
        arr[ai++] = isObject;
    }

    return arr;
}

function setObject(arr, isArray, index) {
    var length   = arr.length,
        total    = length / 3,
        isNested = index !== undefined;

    return function (context, data, next, done) {
        var count = total,
            dataDone  = function () {
                if (--count !== 0) {
                    return false;
                }


                if (isNested && data.parent !== undefined) {
                    data.parent.merge(data);
                }

                next(context, data);

                // done will be undefined if setObject is called by setObject
                if (done !== undefined) {
                    done();
                }

                return true;
            },

            key, val, isObject, i;

        if (context === undefined) {
            done("No context");
            return;
        }

        if (done !== undefined) {
            data = data.clone();
        }

        if (isNested === true) {
            data = data.child()
                        .setIndex(index)
                        .isArray(isArray)
                        .done(dataDone)
                        .ref();
        }

        if (isArray === true) {
            setArray(context, data, dataDone, arr, 0);
            return;
        }

        for (i = 0; i < length; i++) {
            key  = arr[i];
            val  = arr[++i];
            isObject = arr[++i];

            if (isObject === true) {
                val(context, data, dataDone);
            } else {
                data.set(key, val(context, data));
                dataDone();
            }
        }
    };
}

// Call in serial to preserve array order
function setArray(context, data, done, arr, i) {
    var key  = arr[i++],
        val  = arr[i++],
        isObject = arr[i++];

    data.toArray();

    if (isObject === true) {
        val(context, data, function () {
            if (done() === false) {
                setArray(context, data, done, arr, i);
            }
        });
    } else {
        data.push(val(context, data));

        if (done() === false) {
            setArray(context, data, done, arr, i);
        }
    }
}

function setInstance(instance, index) {
    return function (context, data, done) {
        instance.start(context,
                       data.child()
                           .setIndex(index)
                           .done(done)
                           .ref());
    };
}

function setContextNull(context) {
    return getContent(context);
}

function setContextVal(selector) {
    return function (context) {
        return getContent(context.get(selector));
    };
}

function setContextArray(selector) {
    return function (context, data) {
        var nodes  = context.find(selector),
            length = nodes.length - 1,
            i;

        for (i = 0; i < length; i++) {
            data.push(getContent(nodes[i]));
        }

        return getContent(nodes[length]);
    };
}

function setContextFunc(cb) {
    return function (context, data) {

        var val     = cb(context, data),
            content = getContent(val);

        if (content !== undefined) {
            return content;
        }

        return val;

    };
}

function setContextSource(s) {
    var selector = s.replace(sourceSelectorRegexp, '');

    return function (context) {
        var node = context.get(selector);

        if (!node) {
            return;
        }

        return node.toString();
    };
}

function setContextInnerHTML(s) {
    var selector = s.replace(innerHTMLSelectorRegexp, '');

    return function (context) {
        var node = context.get(selector);

        if (!node) {
            return;
        }

        return node.innerHTML;
    };
}

function getContent(node) {
    if (!node) {
        return;
    }

    if (node.text !== undefined) {
        return node.text().trim();
    } else if (node.value !== undefined) {
        return node.value().trim();
    }

    return;
}
