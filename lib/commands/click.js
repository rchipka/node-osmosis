'use strict';

function Click(context, data, next, done) {
    var self     = this,
        selector = this.args[0],
        nodes    = context.find(selector),
        window;

    if (nodes.length === 0) {
        if (this.config().debug === true) {
            this.debug('no results for "' + selector + '"');
        }

        return done();
    }

    window = context.doc().defaultView;
    window.addEventListener('done', function () {
        nodes.forEach(function (node, index) {
            node.dispatchEvent('click');

            window.addEventListener('done', function () {
                if (index === nodes.length - 1) {
                    next(context, data);
                    done();
                }
            });

        });

    });
};

module.exports.click = Click;
