var osmosis = require('../index'),
    server = require('./server'),
    url = server.host + ':' + server.port;

var name = function () {
    return true;
};

module.exports.immediate = function (assert) {
    var calledThen = false;

    new osmosis(url + '/run')
    .then(function (context, data, next, done) {
        assert.equal(context.get('div').textContent, 'loaded');
        calledThen = true;
        next(context, data);
        done();
    })
    .done(function () {
        assert.ok(calledThen);
        assert.done();
    }).run();
};

module.exports.multiple = function (assert) {
    var count = 0, r1, r2,
        instance =
            new osmosis.get(url + '/run')
                .then(function () {
                    count++;
                })
                .done(function () {
                    if (count === 2) {
                        assert.done();
                    }
                });

    r1 = instance.run();
    r2 = instance.run();
};

module.exports.new_instance_command = function (assert) {
    var calledThen = false,
        calledCB   = false,
        instance =
    new osmosis.get(url + '/run')
    .then(function (context, data, next, done) {
        assert.equal(context.get('div').textContent, 'loaded');
        calledThen = true;
        next(context, data);
        done();
    })
    .done(function () {
        assert.ok(calledCB);
        assert.ok(calledThen);
        assert.done();
    });

    setTimeout(function () {
        calledCB = true;
        instance.run();
    }, 500);
};

module.exports.new_instance_get = function (assert) {
    var calledThen = false,
        calledCB   = false,
        instance =
    new osmosis(url + '/run')
    .then(function (context, data, next, done) {
        assert.equal(context.get('div').textContent, 'loaded');
        calledThen = true;
        next(context, data);
        done();
    })
    .done(function () {
        assert.ok(calledCB);
        assert.ok(calledThen);
        assert.done();
    });

    setTimeout(function () {
        calledCB = true;
        instance.run();
    }, 500);
};

server('/run', function (url, req, res) {
    res.setHeader("Content-Type", "text/html");
    res.write('<div>loaded</div>');
    res.end();
});
