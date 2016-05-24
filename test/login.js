var osmosis = require('../index'),
    server = require('./server'),
    URL = require('url'),
    fs = require('fs'),
    url = server.host + ':' + server.port,
    user = 'user',
    pass = 'pass';

module.exports.form = function (assert) {
    var errors = 0;

    osmosis
    .get(url + '/form')
    .login(user, pass)
    .success('div:contains("authenticated")')
    .then(function (context) {
        assert.equal(context.get('div').text(), 'authenticated');
    })
    .follow('a')
    .then(function (context) {
        var div = context.get('div');

        assert.ok(div);
        assert.equal(div.text(), 'done');
    })
    .error(function () {
        errors++;
    })
    .done(function () {
        assert.equal(errors, 0);
        assert.done();
    });
};

module.exports.basic_auth = function (assert) {
    var errors = 0;

    osmosis
    .get(url + '/basic_auth')
    .config({ username: user, password: pass })
    .then(function (context) {
        assert.equal(context.get('div').text(), 'authenticated');
    })
    .follow('a')
    .then(function (context) {
        assert.equal(context.get('div').text(), 'done');
    })
    .error(function () {
        errors++;
    })
    .done(function () {
        assert.equal(errors, 0);
        assert.done();
    });
};

server('/basic_auth', function (url, req, res) {
    var base64, arr;

    if (req.headers.authorization) {
        base64 = new Buffer(
                    req.headers.authorization.replace('Basic ', ''),
                    'base64');
        arr = base64.toString().split(':');

        if (arr[0] != user || arr[1] != pass) {
            res.write('<div>Invalid username or password</div>');
        } else {
            if (url.query.next) {
                res.write('<div>done</div>');
            } else {
                res.write('<div>authenticated</div><a href="?next=true"></a>');
            }
        }
    } else {
        res.writeHead(401, { "Content-Type": "text/html",
                             "Authorization": 'Basic realm="login"' });
        res.write('<div>unauthenticated</div>');
    }

    res.end();
});

server('/form', function (url, req, res, data) {
    res.setHeader('Content-Type', 'text/html');

    if (req.method === 'GET') {
        if (url.query.next && req.headers.cookie == 'auth=true') {
            res.write('<div>done</div>');
        } else {
            res.write('<body><form method="POST">' +
                        '<input name="outer" />' +
                        '<input name="user" />' +
                        '<input name="remember" type="checkbox" />' +
                        '<input type="password" name="pass" />' +
                      '</form></body>');
        }
    } else {
        if (data.user == user && data.pass == pass) {
            res.setHeader('Set-Cookie', 'auth=true; Domain=.yahoo.com');
            res.write('<div>authenticated</div><a href="?next=true"');
        } else {
            res.write('<div>unauthenticated</div>');
        }
    }

    res.end();
});
