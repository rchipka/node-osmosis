var osmosis = require('../index'),
    server = require('./server'),
    url = server.host + ':' + server.port,
    pages = 50;

module.exports.pause = function (assert) {
    var paused = false,
        count   = 0,
        instance =
    new osmosis.get(url + '/pause')
    .follow('a')
    .then(function () {
        assert.ok(!paused);
        count++;
    })
    .done(function () {
        assert.equal(count, pages);
        assert.ok(!paused);
        assert.done();
    });

    instance.run();

    setTimeout(function () {
        paused = true;
        assert.ok(count > 0);
        assert.ok(count < pages);
        instance.pause();

        setTimeout(function () {
            paused = false;
            instance.resume();
        }, 300);
    }, 300);
};

server('/pause', function (url, req, res) {
    var i = 0, out = '';

    res.setHeader("Content-Type", "text/html");

    for (; i < pages; i++) {
        out += '<a href="/pause"></a>';
    }

    res.write(out);

    setTimeout(function () {
        res.end();
    }, 50);
});
