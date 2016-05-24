var osmosis = require('../index'),
    html = '<head>' +
            '<title>test</title>' +
            '</head><body>' +
                '<b>1</b><b>2</b><b>3</b>' +
            '</body>';

module.exports.contains = function (assert) {
    var count = 0;

    osmosis
    .parse(html)
    .find("b")
    .contains('1')
    .then(function () {
        count++;
    })
    .done(function () {
        assert.equal(count, 1);
        assert.done();
    });
};

module.exports.fail = function (assert) {
    var count = 0, errored = false;

    osmosis
    .parse(html)
    .find("b")
    .fail("node():contains('1')")
    .then(function () {
        count++;
    })
    .error(function (msg) {
        if (msg.indexOf('node():contains') > -1) {
            errored = true;
        }
    })
    .done(function () {
        assert.ok(errored);
        assert.equal(count, 2);
        assert.done();
    });
};

module.exports.filter = function (assert) {
    var count = 0;

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
    var count = 0;

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
