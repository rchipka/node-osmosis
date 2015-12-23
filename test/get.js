var osmosis = require('../index');
var server = require('./server');
var URL = require('url');
var fs = require('fs');

var url = server.host+':'+server.port;

module.exports.format_url = function(assert) {
    osmosis.get(url)
    .data(function(data) {
        data.name = 'test'
    })
    .get('/%{name}-${p}')
    .then(function(context, data) {
        assert.ok(context.get('p').text().indexOf('success') !== -1)
    })
    .done(function() {
        assert.done();
    })
}

module.exports.function_url = function(assert) {
    osmosis.get(url)
    .data(function(data) {
        data.name = 'test'
    })
    .get(function(context, data) {
        return data.name+'-'+context.get('p').content();
    })
    .then(function(context, data) {
        assert.ok(context.get('p').text().indexOf('success') !== -1)
    })
    .done(function() {
        assert.done();
    })
}

module.exports.redirect = function(assert) {
    osmosis.get(url+'/?redirect=true')
    .then(function(context, data) {
        assert.ok(context.request.headers.referer.length > 0)
        assert.ok(context.get('div').text() == context.location.pathname)
        assert.ok(context.get('div').text().indexOf('redirect') !== -1)
    })
    .done(function() {
        assert.done();
    })
}

module.exports.error_404 = function(assert) {
    var tries = 3;
    osmosis.get(url+'/404')
    .config('tries', tries)
    .error(function(msg) {
        if (msg.indexOf('404') > -1)
            tries--;
    })
    .done(function() {
        assert.ok(tries === 0);
        assert.done();
    })
}

module.exports.error_redirect = function(assert) {
    var tries = 3;
    osmosis.get(url+'/error-redirect')
    .config('follow', tries)
    .config('follow', tries)
    .error(function(msg) {
        if (msg.indexOf('redirect') > -1)
            tries--;
    })
    .done(function() {
        assert.ok(tries === 0);
        assert.done();
    })
}

module.exports.error_parse = function(assert) {
    var tries = 3;
    osmosis.get(url+'/error-parse')
    .config('follow', tries)
    .error(function(msg) {
        if (msg.indexOf('empty') > -1)
            tries--;
    })
    .done(function() {
        assert.ok(tries === 0);
        assert.done();
    })
}


server('/', function(url, req, res) {
    if (url.query.redirect !== undefined) {
        res.writeHead(301, { Location: '/redirect' });
        res.end();
        return;
    }
    res.write('<p>test</p><div>'+JSON.stringify(req.query)+'</div>')
    res.end();
})

server('/404', function(url, req, res) {
    res.writeHead(404)
    res.end();
})

server('/error-redirect', function(url, req, res) {
    res.writeHead(301, { Location: '/error-redirect' })
    res.end();
})

server('/error-parse', function(url, req, res) {
    res.writeHead(200)
    res.end();
})


server('/redirect', function(url, req, res) {
    res.write('<div>/redirect</div>')
    res.end();
})

server('/test-test', function(url, req, res) {
    res.write('<p>success</p>')
    res.end();
})
