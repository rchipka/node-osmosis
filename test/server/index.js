var http = require('http');
var URL = require("url");
var qs = require("querystring");

var host = 'localhost';
var port = 1337;

var server = http.createServer(function(req, res) {
    var url = URL.parse(req.url, true);
    var uri = url.pathname;
    if (paths[uri] !== undefined) {
        if (req.method === 'POST') {
            var postData = '';
            req.on('data', function(chunk) {
                postData += chunk.toString();
            })
            req.on('end', function() {
                paths[uri](url, req, res, qs.parse(postData))
            })
        }else
            paths[uri](url, req, res)
    }else{
        res.send(404)
    }
});

server.on('error', function(err) {
    console.log("ERROR:", error);
})

server.listen(port);

var paths = {
}

module.exports = function(path, cb) {
    paths[path] = cb;
};

module.exports.host = host;
module.exports.port = port;
module.exports.close = function() {
    server.close();
}
