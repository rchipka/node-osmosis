var osmosis = require('../index'),
    server  = require('./server'),
    url     = server.host + ':' + server.port;

module.exports.stop = function (assert) {
    var error = false, count = 0, instance =
    osmosis.get(url + '/delay-response')
    .follow('a')
    .follow('a')
    .follow('a')
    .log(function (msg) {
        if (msg.indexOf('loaded') > -1) {
            if (++count === 2) {
                instance.stop();
            }
        }
    })
    .then(function () {
        error = true;
    })
    .done(function () {
        assert.equal(count, 2);
        assert.equal(error, false);
        assert.ok(true);
        assert.done();
    });
};


server('/delay-response', function (url, req, res) {
    res.setHeader("Content-Type", "text/html");
    res.end('<a href="/delay-response"></a>');
});
