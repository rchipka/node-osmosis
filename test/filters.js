var osmosis = require('../index'),
    html = '<head><title>test</title></head><body><b>1</b><b>2</b><b>3</b></body>';

module.exports.contains = function (assert) {
    count = 0;
    osmosis
    .parse(html)
    .find("b")
    .contains('1')
    .then(function () {
        count++;
    })
    .done(function () {
        assert.ok(count === 1);
        assert.done();
    });
};

/*
 * DEPRECATED

module.exports.failure = function (assert) {
    count = 0;
    osmosis
    .parse(html)
    .find("b")
    .failure("node():contains('1')")
    .then(function () {
        count++;
    })
    .done(function () {
        assert.ok(count === 2);
        assert.done();
    });
};*/

module.exports.filter = function (assert) {
    count = 0;
    osmosis
    .parse(html)
    .find("b")
    .filter("node():not(:contains('1'))")
    .then(function () {
        count++;
    })
    .done(function () {
        assert.ok(count === 2);
        assert.done();
    });
};

module.exports.match = function (assert) {
    count = 0;
    osmosis
    .parse(html)
    .find("b")
    .match(/[1-2]/)
    .then(function () {
        count++;
    })
    .done(function () {
        assert.ok(count === 2);
        assert.done();
    });
};
