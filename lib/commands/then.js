/**
 * Execute a given {@link callback}.
 *
 * @function then
 * @memberof Command
 * @param {callback} callback
 * @instance
 */

/**
 * The next function is used to send a {@link context} and
 * a {@link data} object to the immediately following Command.
 *
 * The {@link next} function must be called if you want to change
 * the context or data object.
 *
 * @callback next
 * @param {context} context - The context to send to the following command
 * @param {data}    data    - The data object to send to the following command
 * @see done
 * @see callback
 * @see {@link Command.then}
 */

/**
 * The done function is used to tell Osmosis that a
 * callback has finished **asynchronous** execution.
 *
 * The {@link done} function is required if the
 * callback function calls {@link next} asynchronously.
 *
 * The {@link done} function MUST be called if it is included
 * as an argument to the callback function.
 *
 * Note: You must not call {@link next} after calling done.
 *
 * @callback done
 * @see next
 * @see callback
 * @see {@link Command.then}
 */

/**
 * A callback function can be used to access and modify
 * the {@link context} and {@link data} object at the current
 * point in the command chain.
 *
 * @callback callback
 * @param {context} context - The current HTML/XML context
 * @param {data} data - The current data object
 * @param {next} [next] - Continue a context and data down the chain
 * @param {done} [done] - Called when finished calling {@link next}
 * @this Command
 * @see {@link Command.then}
 */


var regexp_function_arg = /^\s*(function\s*)?\(?([^\s\,\)]+)/;

function Then(callback, getContext) {
    var length = callback.length;

    return function (context, data, next, done) {
        var self = this, calledDone = false;

        getContext(context, function (context) {
            callback.call(self, context, data.getObject(), function (c, d) {
                next(c, data.setObject(d));

                if (length === 3 && calledDone === false) {
                    process.nextTick(done);
                    calledDone = true;
                }
            }, done);

            if (length <= 2) {
                next(context, data);
                done();
            }
        });
    };
}

function getContextArg(context, callback) {
    callback(context);
}

function getDocumentArg(context, callback) {
    callback(context.document || context.doc());
}

function getWindowArg(context, callback) {
    context = context.window || context.doc().defaultView;
    context.addEventListener('done', function () {
        callback(context);
    });
}

function getJQueryArg(context, callback) {
    getWindowArg(context, function (context) {
        if (context.jQuery !== undefined) {
            callback(context.jQuery);
        } else {
            callback(context.$);
        }
    });
}

module.exports.then = function (callback) {
    var getContext   = getContextArg, contextArg;

    if (callback.length > 0) {
        contextArg = callback.toString().match(regexp_function_arg)[2];
    }

    if (contextArg === '$') {
        getContext = getJQueryArg;
    } else if (contextArg === 'window') {
        getContext = getWindowArg;
    } else if (contextArg === 'document') {
        getContext = getDocumentArg;
    }

    return Then(callback, getContext);
};
