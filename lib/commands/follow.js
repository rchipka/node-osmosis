/*jslint node: true */
'use strict';

/**
 * Follow a url.
 *
 * @function follow
 * @memberof Command
 * @param {Selector} selector - A selector string for link nodes
 * @instance
 */

module.exports.follow = function (context, data, next, done) {
    var selector = this.args[0],
        self     = this,
        nodes    = context.find(selector),
        document = context.doc(),
        i = 0, queue = 0, length, node, url,
        requestDone = function (err, document) {
            if (err === null) {
                next(document, data);
            }

            if (--queue === 0) {
                done();
            }
        };

    if (nodes === undefined || nodes.length === 0) {
        done('no results for "' + selector +
             '" in ' + document.location.href);
        return;
    }


    for (length = nodes.length, i = 0; i < length; i++) {
        node = nodes[i];

        if (node.value !== undefined) {
            url = node.value();
        } else if (url = node.attr('href')) {
            // Don't use Attribute.text() or Attribute.value()
            // in order to keep URL encoding
            url = url.toString();
            url = url.substring(url.indexOf('"') + 1, url.lastIndexOf('"'));
        } else {
            url = node.text();
        }

        if (url !== null && url.length > 0) {
            queue++;

            self.log("url: " + url);
            self.request('get',
                        context,
                        url,
                        null,
                        requestDone);
        }
    }

    if (queue === 0) {
        done();
    }
};
