var osmosis = require('../index'),
    server = require('./server'),
    URL = require('url'),
    fs = require('fs'),
    url = server.host + ':' + server.port;

module.exports.href = function (assert) {
    var count = 0;

    osmosis.get(url)
    .follow('li:skip-last > a')
    .then(function (context) {
        assert.ok(context.request.headers.referer);
        assert.ok(context.request.params.page == context.get('div').text());
        count++;
    })
    .done(function () {
        assert.ok(count == 5);
        assert.done();
    });
};


module.exports.delay = function (assert) {
    var count = 0;

    osmosis.get(url)
    .find('li:skip-last > a')
    .delay(0.2)
    .follow('@href')
    .then(function (context) {
        count++;
        assert.ok(context.request.headers.referer);
        assert.equal(context.request.params.page, context.get('div').text());
    })
    .done(function () {
        assert.equal(count, 5);
        assert.done();
    });
};

/*
module.exports.not_found = function(assert) {
    var count = 0;
    osmosis.get(url)
    .follow('a@href', false, function(url) {
        return '/404'
    })
    .then(function(context, data) {
        count++;
    })
    .done(function() {
        assert.ok(count == 5);
        assert.done();
    })
}
*/

module.exports.internal = function (assert) {
    var count = 0;

    osmosis.get(url)
    .follow('li > a:internal')
    .then(function (context) {
        count++;
        assert.ok(context.request.headers.referer);
        assert.ok(context.request.params.page == context.get('div').text());
    })
    .done(function () {
        assert.ok(count == 5);
        assert.done();
    });
};

/*
 * DEPRECATED. Use .find(selector).get(callback) instead.

module.exports.rewrite = function (assert) {
    var count = 0;

    osmosis.get(url)
    .follow('a:internal')
    .rewrite(function () {
        return '/?page=1';
    })
    .then(function (context) {
        assert.ok(context.request.headers.referer);
        assert.ok(1 == context.get('div').text());
    })
    .done(function () {
        assert.done();
    });
};
*/

// TODO: actually save
/*
module.exports.save = function (assert) {
    osmosis.get(url)
    .follow('a:last')
    .then(function () {
        assert.ok(true);
    })
    .done(function () {
        assert.done();
    });
};*/

server('/', function (url, req, res) {
    res.setHeader("Content-Type", "text/html");

    if (url.query.page) {
        res.write('<div>' + url.query.page + '</div>');
    } else {
        res.write('<ul>');

        for (var i = 1; i <= 5; i++) {
            res.write('<li><a href="?page=' + i + '"></a></li>');
        }

        res.write('<li><a href="https://www.google.com/"></a></li>');
        res.write('</ul>');
    }

    res.end();
});


server('/404', function (url, req, res) {
    res.writeHead(404, { "Content-Type": "text/html" });
    res.write('<body></body>');
    res.end();
});
