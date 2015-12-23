var osmosis = require('../index');

var html = '<body></body>';

module.exports.two_args = function(assert) {
    count = 0;
    osmosis.parse(html)
    .then(function(context, data) {
        count++;
    })
    .data(function() {
        count++;
    })
    .done(function() {
        assert.ok(count == 2);
        assert.done();
    })
}

module.exports.three_args = function(assert) {
    count = 0;
    osmosis.parse(html)
    .then(function(context, data, next) {
        setTimeout(function(last) {
            next(context, data);
        }, 200)
    })
    .data(function() {
        count++;
    })
    .done(function() {
        assert.ok(count == 1);
        assert.done();
    })
}


module.exports.four_args = function(assert) {
    count = 0;
    osmosis.parse(html)
    .then(function(context, data, next, done) {
        for (var i = 0; i < 3; i++) {
            setTimeout(function(last) {
                next(context, data);
                if (last)
                    done();
            }, i * 200, i == 2)

        }
    })
    .data(function() {
        count++;
    })
    .done(function() {
        assert.done();
    })
}

module.exports.document = function(assert) {
    osmosis.parse(html)
    .then(function(document, data) {
        assert.ok(document.documentElement)
    })
    .done(function() {
        assert.done();
    })
}

module.exports.window = function(assert) {
    osmosis.parse(html)
    .then(function(window, data) {
        assert.ok(window.window)
    })
    .done(function() {
        assert.done();
    })
}

/*
module.exports.jquery = function(assert) {
    osmosis.parse(html)
    .then(function($, data) {
        assert.ok(typeof $ === "function")
    })
    .done(function() {
        assert.done();
    })
}
*/
