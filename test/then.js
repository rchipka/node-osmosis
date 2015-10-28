var osmosis = require('../index');
var server = require('./server');

var html = '<body></body>'

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
};

module.exports.three_args = function(assert) {
    count = 0;
    osmosis.parse(html)
    .then(function(context, data, next) {
        next(context, data);
    })
    .data(function() {
        count++;
    })
    .done(function() {
        assert.ok(count == 1);
        assert.done();
    })
};


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
        assert.ok(count == 3);
        server.close();
        assert.done();
    })
};
