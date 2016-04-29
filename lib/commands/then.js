/**
 * Execute a given {@link middlewareCallback}.
 *
 * @function then
 * @memberof Command
 * @param {middlewareCallback} callback
 */

/**
 * The thenNext function is used to send a {@link context} and
 * a {@link data} object to the immediately following Command.
 *
 * @param {context} context - The context to send to the following command
 * @param {data}    data    - The data object to send to the following command
 * @see thenDone
 * @see thenCallback
 * @see Command.then
 */

/**
 * The thenDone function is used to tell Osmosis that a
 * callback has finished **asynchronously** calling {@link thenNext}.
 *
 * @see thenNext
 * @see thenCallback
 * @see Command.then
 */

/**
 * A thenCallback can be used to set, modify, or validate
 * the {@link context} or {@link data} object at the current
 * point in the command chain.
 *
 * @callback thenCallback
 * @param {context} context - The current HTML/XML context
 * @param {data} data - The current data object
 * @param {thenNext} [next] - Continue a context and data down the chain
 * @param {thenDone} [done] - Called when finished calling `next`
 * @see Command.then
 */


var regexp_function_arg = /^\s*(function\s*)\(?([^\s\,\)]+)/;

function Then(callback, getContext) {
    var length = callback.length;

    return function (context, data, next, done) {
        var self = this, calledDone = false;

        getContext(context, function (context) {
            callback.call(self, context, data.getObject(), function (c, d) {
                data.setObject(d);
                next(c, data);

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
