var osmosis = require('../index'),
    html = '<body><b>1</b><b>2</b><b>3</b></body>';

module.exports.two_args = function (assert) {
    var count = 0,
        calledThen = false,
        calledDone = false;

    osmosis.parse(html)
    .find('b')
    .then(function (context) {
        assert.equal(++count, context.text());
        calledThen = true;
    })
    .data(function () {
        calledData = true;
    })
    .done(function () {
        assert.equal(count, 3);
        assert.ok(calledThen);
        assert.ok(calledData);
        assert.done();
    });
};

module.exports.three_args = function (assert) {
    var count = 0,
        calledThen1 = false,
        calledThen2 = false,
        calledDone = false,
        i;

    osmosis.parse(html)
    .find('b')
    .then(function (context, data, next) {
        assert.equal(++count, context.text());
        setTimeout(function () {
            next(context, data);
        }, 200);
        calledThen1 = true;
    })
    .then(function (context, data, next) {
        for (i = 0; i < 3; i++) {
            next(context, data);
        }

        calledThen2 = true;
    })
    .data(function () {
        calledData = true;
    })
    .done(function () {
        assert.equal(count, 3);
        assert.ok(calledThen1);
        assert.ok(calledThen2);
        assert.ok(calledData);
        assert.done();
    });
};

module.exports.four_args = function (assert) {
    var count = 0,
        calledThen = false,
        calledDone = false,
        i;

    osmosis.parse(html)
    .find('b')
    .then(function (context, data, next, done) {
        assert.equal(++count, context.text());

        for (i = 0; i < 3; i++) {
            setTimeout(function (last) {
                next(context, data);

                if (last) {
                    done();
                }
            }, i * 200, i == 2);
        }

        calledThen = true;
    })
    .data(function () {
        calledData = true;
    })
    .done(function () {
        assert.equal(count, 3);
        assert.ok(calledThen);
        assert.ok(calledData);
        assert.done();
    });
};

module.exports.document = function (assert) {
    osmosis.parse(html)
    .then(function (document) {
        assert.ok(document.documentElement);
    })
    .done(function () {
        assert.done();
    });
};

module.exports.window = function (assert) {
    osmosis.parse(html)
    .then(function (window) {
        assert.ok(window.window);
    })
    .done(function () {
        assert.done();
    });
};

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
