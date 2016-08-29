var osmosis = require('../index');
var server = require('./server');
var http = require('http');


var url = server.host + ':' + server.port;

var proxy = function (request, response) {
    var req = http.request(request.url + (request.url.indexOf('?') == -1 ? '?' : '&') + 'proxy=' + request.socket.localPort);

    req.addListener('response', function (res) {
        res.addListener('data', function (chunk) {
            response.write(chunk, 'binary');
        });
        res.addListener('end', function () {
            response.end();
        });
        response.writeHead(res.statusCode, res.headers);
    });
    request.addListener('data', function (chunk) {
        req.write(chunk, 'binary');
    });
    request.addListener('end', function () {
        req.end();
    });
};

var proxies = [];

for (var port = 8080; port < 8090; port++) {
    proxies.push(http.createServer(proxy).listen(port));
}

module.exports.config = function (assert) {
    osmosis.get(url + '/proxy')
    .config('proxy', '127.0.0.1:8080')
    .then(function (context) {
        assert.ok(context.get('div').text() == '8080');
    })
    .done(function () {
        assert.done();
    });
};

module.exports.macro = function (assert) {
    osmosis.get(url + '/proxy')
    .proxy('127.0.0.1:8080')
    .then(function (context) {
        assert.ok(context.get('div').text() == '8080');
    })
    .done(function () {
        assert.done();
    });
};

module.exports.multiple = function (assert) {
    var p = [];

    proxies.forEach(function (proxy) {
        p.push('localhost:' + proxy.address().port);
    });

    osmosis.get(url + '/proxy')
    .config('tries', p.length)
    .proxy(p)
    .then(function (context) {
        assert.equal(context.get('div').text(), '8080');
    })
    .get('/proxy?err=true')
    .done(function () {
        assert.equal(p.length, 1);
        proxies.forEach(function (proxy) {
            proxy.close();
        });
        assert.done();
    });
};

server('/proxy', function (url, req, res) {
    if (url.query.err !== undefined) {
        res.writeHead(500);
        res.end();
        return;
    }

    res.setHeader("Content-Type", "text/html");
    res.write('<div>' + url.query.proxy + '</div>');
    res.end();
});
