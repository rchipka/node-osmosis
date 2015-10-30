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

server('/', function(url, req, res) {
    res.write('<p>test</p><div>'+JSON.stringify(req.query)+'</div>')
    res.end();
})

server('/test-test', function(url, req, res) {
    res.write('<p>success</p>')
    res.end();
})
