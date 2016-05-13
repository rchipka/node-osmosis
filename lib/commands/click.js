/*jslint node: true */
'use strict';

/**
 * Click an HTML element and continue after all events finish.
 *
 * @function click
 * @param {Selector} selector - Node(s) to click
 * @memberof Command
 * @instance
 * @example {@lang javascript}
 * .click('#nav > a')
 * .then(function(window) {
 *      var ajax = window.document.querySelector("#ajaxContent");
 *
 *      if (ajax.textContent.length > 0) {
 *          this.log("ajax loaded");
 *      }
 * })
 */

function Click(context, data, next, done) {
    var self     = this,
        selector = this.args[0],
        nodes    = context.find(selector),
        window;

    if (nodes.length === 0) {
        if (this.getOpts().debug === true) {
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
}

module.exports.click = Click;
