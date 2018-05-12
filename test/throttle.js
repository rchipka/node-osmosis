var osmosis = require('../index'),
    server  = require('./server'),
    url     = server.host + ':' + server.port;


module.exports.on = function (assert) {
    var date0 = +Date.now(), interval = 2000;
    osmosis.get(url + '/get')
    .throttle(2, interval)
    .then(function () {
        var date = +Date.now();
        assert.ok(date - date0 < interval);
    })
    .get(url + '/get')
    .then(function () {
        var date = +Date.now();
        assert.ok(date - date0 < interval);
    })
    .get(url + '/get')
    .then(function () {
        var date = +Date.now();
        assert.ok(date - date0 >= interval);
    })
    .done(function () {
        assert.done();
    });
};

module.exports.off = function (assert) {
    var date0 = +Date.now(), interval = 2000;
    osmosis.get(url + '/get')
    .then(function () {
        var date = +Date.now();
        assert.ok(date - date0 < interval);
    })
    .get(url + '/get')
    .then(function () {
        var date = +Date.now();
        assert.ok(date - date0 < interval);
    })
    .get(url + '/get')
    .then(function () {
        var date = +Date.now();
        assert.ok(date - date0 < interval);
    })
    .done(function () {
        assert.done();
    });
};

