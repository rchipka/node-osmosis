var osmosis = require('../index');

var html = '<body><b>1</b><b>2</b><b>3</b></body>';

module.exports.two_args = function(assert) {
    var count = 0;
    var calledThen = false;
    var calledDone = false;
    osmosis.parse(html)
    .find('b')
    .then(function(context, data) {
        assert.equal(++count, context.text());
        calledThen = true;
    })
    .data(function(data) {
        calledData = true;
    })
    .done(function() {
        assert.equal(count, 3);
        assert.ok(calledThen);
        assert.ok(calledData);
        assert.done();
    })
}

module.exports.three_args = function(assert) {
    var count = 0;
    var calledThen1 = false;
    var calledThen2 = false;
    var calledDone = false;
    osmosis.parse(html)
    .find('b')
    .then(function(context, data, next) {
        assert.equal(++count, context.text());
        setTimeout(function(last) {
            next(context, data);
        }, 200)
        calledThen1 = true;
    })
    .then(function(context, data, next) {
        for (var i = 0; i < 3; i++) {
            next(context, data);
        }
        calledThen2 = true;
    })
    .data(function() {
        calledData = true;
    })
    .done(function() {
        assert.equal(count, 3);
        assert.ok(calledThen1);
        assert.ok(calledThen2);
        assert.ok(calledData);
        assert.done();
    })
}


module.exports.four_args = function(assert) {
    var count = 0;
    var calledThen = false;
    var calledDone = false;
    osmosis.parse(html)
    .find('b')
    .then(function(context, data, next, done) {
        assert.equal(++count, context.text());
        for (var i = 0; i < 3; i++) {
            setTimeout(function(last) {
                next(context, data);
                if (last)
                    done();
            }, i * 200, i == 2)
        }
        calledThen = true;
    })
    .data(function() {
        calledData = true;
    })
    .done(function() {
        assert.equal(count, 3);
        assert.ok(calledThen);
        assert.ok(calledData);
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
