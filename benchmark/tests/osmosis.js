'use strict';

var osmosis = require('../../');

module.exports.osmosis = function (timer, url) {
    timer.start();

    osmosis(url)
    .set({
        links: osmosis.follow('a').find('title')
    })
    .done(function () {
        timer.stop();
    });
};
