var osmosis = require('../index');
var server = require('./server');
var URL = require('url');
var fs = require('fs');

var url = server.host+':'+server.port;
var user = 'user';
var pass = 'pass';

module.exports.form = function(assert) {
    var errors = 0;
    osmosis
    .get(url+'/form')
    .login(user, pass, 'div:contains("authenticated")')
    .then(function(context, data) {
        assert.ok(context.get('div').text() == 'authenticated');
    })
    .follow('a')
    .then(function(context, data) {
        var div = context.get('div');
        assert.ok(div !== null)
        assert.ok(div.text() == 'done');
    })
    .error(function(msg) {
        errors++;
    })
    .done(function() {
        assert.ok(errors === 0);
        assert.done();
    })
}

module.exports.basic_auth = function(assert) {
    var errors = 0;
    osmosis
    .config({ username: user, password: pass })
    .get(url+'/basic_auth')
    .then(function(context, data) {
        assert.ok(context.get('div').text() == 'authenticated');
    })
    .follow('a')
    .then(function(context, data) {
        assert.ok(context.get('div').text() == 'done');
    })
    .error(function(msg) {
        errors++;
    })
    .done(function() {
        assert.ok(errors === 0);
        assert.done();
    })
}

server('/basic_auth', function(url, req, res, data) {
    if (req.headers.authorization) {
        var base64 = new Buffer(req.headers.authorization.replace('Basic ', ''), 'base64');
        var arr = base64.toString().split(':')
        if (arr[0] != user || arr[1] != pass) {
            res.write('<div>Invalid username or password</div>');
        }else{
            if (url.query.next) {
                res.write('<div>done</div>')
            }else{
                res.write('<div>authenticated</div><a href="?next=true"></a>')
            }
        }
    }else{
        res.writeHead(401, {"Content-Type": "text/html", "Authorization": 'Basic realm="login"'})
        res.write('<div>unauthenticated</div>')
    }
    res.end();
})

server('/form', function(url, req, res, data) {
    res.setHeader('Content-Type', 'text/html');
    if (req.method === 'GET') {
        if (url.query.next && req.headers.cookie == 'auth=true') {
            res.write('<div>done</div>')
        }else{
            res.write('<body><form method="POST"><input name="outer" /><input name="user" /><input name="remember" type="checkbox" /><input type="password" name="pass" /></form></body>')
        }
    }else{
        if (data.user == user && data.pass == pass) {
            res.setHeader('Set-Cookie', 'auth=true; Domain=.yahoo.com');
            res.write('<div>authenticated</div><a href="?next=true"')
        }else{
            res.write('<div>unauthenticated</div>')
        }
    }
    res.end();
})
