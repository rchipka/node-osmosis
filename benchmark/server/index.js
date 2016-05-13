var http = require('http'),
    URL  = require('url'),
    qs   = require('querystring'),
    fs   = require('fs'),
    file = fs.readFileSync(__dirname + '/index.html'),
    host = 'localhost',
    port = 1337,
    server;

server = http.createServer(function (req, res) {
    var url = URL.parse(req.url);

    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(fs.readFileSync(__dirname + url.pathname));
});

server.on('error', function () {
    console.log('ERROR:', error);
});

server.listen(port);


module.exports.host = host;
module.exports.port = port;
module.exports.url  = 'http://' + host + ':' + port + '/index.html';
module.exports.close = function () {
    server.close();
};
