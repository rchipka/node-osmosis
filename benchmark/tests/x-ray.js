'use strict';

var Xray = require('x-ray');

module.exports.xray = function (timer, url) {
    var x = Xray(), total = 0;

    timer.start();

    x(url, ['a'])(function (err, arr) {
        var i = arr.length + 1;

        while (--i) {
            x(url, { title: 'title' })(function () {
                if (++total === arr.length) {
                    timer.stop();
                }
            });
        }
    });
};
