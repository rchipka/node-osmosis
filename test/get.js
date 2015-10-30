var osmosis = require('../index');
var server = require('./server');
var URL = require('url');
var fs = require('fs');

var url = server.host+':'+server.port;

module.exports.dynamic_url = function(assert) {
    osmosis.get(url)
    .find('div')
    .get('/%{test}-${title}-name.html')
}

server('/', function(url, req, res, data) {
    res.write('<p>test</p><div>'+JSON.stringify(req.query)+'</div>')
    res.end();
})
