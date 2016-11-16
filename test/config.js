'use strict';

var osmosis = require('../index'),
    server = require('./server'),
    url = server.host + ':' + server.port,
    html = '<head>' +
                '<title>test</title>' +
           '</head><body><a href="/rel"></a></body>';

module.exports.config = function (assert) {
    osmosis
    .config('ext', true);

    osmosis
    .config('one', 1);

    osmosis.parse(html)
    .config('proxy', 'localhost')
    .then(function () {
        var opts = this.getOpts();

        assert.equal(opts.one, 1);
        assert.equal(opts.ext, true);
        assert.equal(opts.proxy, 'localhost');
    })
    .config('test', true)
    .then(function () {
        var opts = this.getOpts();

        assert.equal(opts.one, 1);
        assert.equal(opts.ext, true);
        assert.equal(opts.test, true);
        assert.equal(opts.proxy, 'localhost');
    })
    .done(function () {
        var opts = osmosis.getOpts();

        assert.equal(opts.one, 1);
        assert.equal(opts.ext, true);
        assert.equal(opts.test, undefined);
        assert.equal(opts.proxy, undefined);
        assert.done();
    });
};

module.exports.global_cookies = function (assert) {
    osmosis.config('cookies', { gc1: 'overwriteMe', fake: true });
    osmosis.config('cookies', { gc1: 'set' });

    assert.deepEqual(osmosis.getOpts().cookies,
                    { gc1: 'set' });

    osmosis(url + '/headers')
        .then(function (context) {
            assert.ok(context.querySelector('cookie'));
            assert.equal(context.querySelector('cookie').textContent,
                        'gc1=set');
        })
        .post(url + '/headers')
        .cookie('c1', 'yes')
        .then(function (context) {
            assert.ok(context.querySelector('cookie'));
            assert.equal(context.querySelector('cookie').textContent,
                        'gc1=set; c1=yes');
        })
        .done(function () {
            osmosis.config('cookies', {});
            assert.done();
        });
};


module.exports.instance_cookies = function (assert) {
    var instance,
        expected = {
            gc1: 'true',
            cookie1: 'true',
            cookie2: 'true'
        };

    osmosis.config('cookies', { gc1: true });

    instance = new osmosis(url + '/headers')
        .cookie('cookie1', true)
        .then(function (context) {
            assert.ok(context.querySelector('cookie'));
            assert.deepEqual(
                        parseCookies(
                            context.querySelector('cookie').textContent),
                        expected);
        })
        .set({
            'get_cookies': 'cookie',
            'post_cookies': osmosis.post(url + '/set-cookie-redirect')
                            .follow('a').find('cookie'),
            'follow_cookies': osmosis.follow('a')
                                .find('cookie')
                                .then(function (node, data, next) {
                                    next(node, parseCookies(node.textContent));
                                }),
            'set_cookies': osmosis.get('/set-cookie-redirect')
                            .follow('a')
                            .find('cookie')
                            .then(function (node, data, next) {
                                next(node, parseCookies(node.textContent));
                            })
        })
        .data(function (data) {
            assert.deepEqual(parseCookies(data.get_cookies), expected);
            assert.deepEqual(data.follow_cookies, expected);
            expected.testSetCookie1 = 'true';
            expected.testSetCookie2 = 'true';
            assert.deepEqual(parseCookies(data.post_cookies), expected);
            assert.deepEqual(data.set_cookies, expected);
        })
        .done(function () {
            osmosis.config('cookies', {});
            assert.done();
        });

    instance.cookie('cookie2', true);

    instance.run();
};

module.exports.headers = function (assert) {
    var calledThen = false;

    osmosis
    .get(url + '/headers')
    .header('one', 1)
    .headers({ 'test': true })
    .then(function (context) {
        var opts = this.getOpts();

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
    var calledThen = false;

    osmosis
    .get(function () {
        return url + '/headers';
    })
    .then(function (context) {
        assert.equal(context.find('host').length, 1);
        calledThen = true;
    })
    .done(function () {
        assert.ok(calledThen);
        assert.done();
    });
};

server('/headers', function (url, req, res) {
    var key;

    res.setHeader("Content-Type", "text/html");

    for (key in req.headers) {
        res.write('<' + key + '>' + req.headers[key] + '</' + key + '>');
    }

    res.write('<a href="#">test</a>');

    res.end();
});

/* TODO: Save redirect cookies once Needle is capable. */
server('/set-cookie-redirect', function (href, req, res) {
    res.writeHead(301, { Location: 'http://' + url + '/set-cookie',
                         'Set-Cookie': 'testSetCookie1=true' });
    res.end();
});

server('/set-cookie', function (url, req, res) {
    res.writeHead(200, { 'Content-Type': 'text/html',
                         'Set-Cookie': 'testSetCookie2=true' });
    res.end('<a href="/headers"></a>');
});

function parseCookies(str) {
    var cookies = {};

    str.split('; ').forEach(function (c) {
        var arr = c.split('=');

        cookies[arr[0]] = arr[1];
    });

    return cookies;
}
