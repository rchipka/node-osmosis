var osmosis = require('../index'),
    server  = require('./server'),
    RateLimiter = require('limiter').RateLimiter,
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


module.exports.global_throttle = function (assert) {
  var date0 = +Date.now(), interval = 2000;
  osmosis.config('throttle', new RateLimiter(2, interval));
  osmosis.get(url + '/get')
    .then(function () {
      var date = +Date.now();
      assert.ok(date - date0 < interval);
    })
    .set({
      test: osmosis
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
    })
    .done(function () {
      assert.done();
      // Turn global throttling off, so it won't affect other tests
      osmosis.config('throttle', new RateLimiter(999, 1));
    });
};


module.exports.dynamic_change = function (assert) {
  var date0 = +Date.now(), interval = 2000, date1, date2;
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
      var date = date1 = +Date.now();
      assert.ok(date - date0 < interval);
    })
    .throttle(2, interval)
    .get(url + '/get')
    .then(function () {
      var date = +Date.now();
      assert.ok(date - date1 < interval);
    })
    .get(url + '/get')
    .then(function () {
      var date = +Date.now();
      assert.ok(date - date1 < interval);
    })
    .get(url + '/get')
    .then(function () {
      var date = date2 = +Date.now();
      assert.ok(date - date1 >= interval);
    })
    .throttle() // relax
    .get(url + '/get')
    .then(function () {
      var date = +Date.now();
      assert.ok(date - date2 < interval);
    })
    .get(url + '/get')
    .then(function () {
      var date = +Date.now();
      assert.ok(date - date2 < interval);
    })
    .get(url + '/get')
    .then(function () {
      var date = +Date.now();
      assert.ok(date - date2 < interval);
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

