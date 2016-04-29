var osmosis = require('../index');
var server = require('./server');

var url = server.host + ':' + server.port;

var html = '<head><title>test</title></head><body><a href="/rel"></a></body>';

module.exports.config = function (assert) {
    osmosis
    .config('ext', true);

    osmosis
    .config('one', 1);

    osmosis.parse(html)
    .config('proxy', 'localhost')
    .then(function () {
        var opts = this.config();

        assert.equal(opts.one, 1);
        assert.equal(opts.ext, true);
        assert.equal(opts.proxy, 'localhost');
    })
    .config('test', true)
    .then(function () {
        var opts = this.config();

        assert.equal(opts.one, 1);
        assert.equal(opts.ext, true);
        assert.equal(opts.test, true);
        assert.equal(opts.proxy, 'localhost');
    })
    .done(function () {
        var opts = osmosis.config();

        assert.equal(opts.one, 1);
        assert.equal(opts.ext, true);
        assert.equal(opts.test, undefined);
        assert.equal(opts.proxy, undefined);
        assert.done();
    });
};

module.exports.headers = function (assert) {
    var calledThen = false;

    osmosis
    .get(url + '/headers')
    .header('one', 1)
    .headers({ 'test': true })
    .then(function (context) {
        var opts = this.config();

        calledThen = true;

        assert.equal(opts.headers.one, 1);
        assert.equal(opts.headers.test, true);
        assert.equal(context.get('one').text(), '1');
        assert.equal(context.get('test').text(), 'true');
    })
    .done(function () {
        assert.ok(calledThen);
        assert.done();
    });
};

module.exports.rewrite = function (assert) {
    osmosis
    .get(function () {
        return url + '/headers';
    })
    .then(function (context) {
        assert.equal(context.find('host').length, 1);
    })
    .done(function () {
        assert.done();
    });
};

server('/headers', function (url, req, res) {
    res.setHeader("Content-Type", "text/html");

    for (var key in req.headers) {
        res.write('<' + key + '>' + req.headers[key] + '</' + key + '>');
    }

    res.end();
});
