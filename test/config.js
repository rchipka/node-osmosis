var osmosis = require('../index');
var server = require('./server');

var url = server.host+':'+server.port;

var html = '<head><title>test</title></head><body><a href="/rel"></a></body>';

module.exports.config = function(assert) {
    osmosis
    .config('ext', true)

    osmosis
    .config('one', 1)
    .parse(html)
    .config('proxy', 'localhost')
    .then(function(context, data) {
        var opts = this.config();
        assert.ok(opts.user_agent !== undefined);
        assert.ok(opts.one === 1);
        assert.ok(opts.ext === true);
        assert.ok(opts.proxy === 'localhost');
    })
    .config('test', true)
    .then(function(context, data) {
        var opts = this.config();
        assert.ok(opts.user_agent !== undefined);
        assert.ok(opts.one === 1);
        assert.ok(opts.ext === true);
        assert.ok(opts.test === true);
        assert.ok(opts.proxy === 'localhost');
    })
    .done(function() {
        var opts = osmosis.config();
        assert.ok(opts.user_agent !== undefined);
        assert.ok(opts.one === 1);
        assert.ok(opts.ext === true);
        assert.ok(opts.test === undefined);
        assert.ok(opts.proxy === undefined);
        assert.done();
    })
};

module.exports.headers = function(assert) {
    osmosis
    .get(url + '/headers')
    .header('one', 1)
    .headers({ 'test': true })
    .then(function(context, data) {
        var opts = this.config();
        assert.ok(opts.headers.one === 1)
        assert.ok(opts.headers.test === true);
        assert.ok(context.get('one').text() === '1');
        assert.ok(context.get('test').text() === 'true');
    })
    .done(function() {
        assert.done();
    })
}

module.exports.rewrite = function(assert) {
    osmosis
    .get(url)
    .rewrite(function(url) {
        return url+'/headers';
    })
    .then(function(context, data) {
        assert.ok(context.find('host').length === 1)
    })
    .get(url)
    .then(function(context, data) {
        assert.ok(context.find('host').length === 0)
    })
    .done(function() {
        assert.done();
    })
}

server('/headers', function(url, req, res, data) {
    res.setHeader("Content-Type", "text/html");
    for (var key in req.headers) {
        res.write('<'+key+'>'+req.headers[key]+'</'+key+'>');
    }
    res.end();
})
