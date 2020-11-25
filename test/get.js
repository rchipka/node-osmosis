var osmosis = require('../index'),
    server  = require('./server'),
    URL     = require('url'),
    fs      = require('fs'),
    url     = server.host + ':' + server.port;


module.exports.function_url = function (assert) {
    osmosis.get(url + '/get')
    .then(function (context, data, next) {
        data.name = 'test';
        next(context, data);
    })
    .get(function (context, data) {
        return data.name + '-' + context.querySelector('p').innerText;
    })
    .then(function (context) {
        assert.ok(context.get('p').text().indexOf('success') !== -1);
    })
    .done(function () {
        assert.done();
    });
};

module.exports.function_params = function (assert) {
    osmosis.get(url + '/test-test')
    .then(function (context, data, next) {
        data.name = 'test';
        next(context, data);
    })
    .get(url + '/get', function (context, data) {
        var params = {};
        params[data.name] = context.get('p').text();
        return params;
    })
    .then(function (context) {
        assert.ok(context.get('div').text().indexOf('success') !== -1);
    })
    .done(function () {
        assert.done();
    });
};

module.exports.redirect = function (assert) {
    var calledThen = false,
        logged = false;

    osmosis.get(url + '/get?redirect=true')
    .then(function (context) {
        calledThen = true;
        assert.ok(context.request.headers.referer.length > 0);
        assert.equal(context.get('div').text(),
                     context.location.pathname);
        assert.ok(context.get('div').text().indexOf('redirect') !== -1);
    })
    .log(function (msg) {
        if (msg.indexOf('[redirect]') > -1) {
            logged = true;
        }
    })
    .done(function () {
        assert.ok(calledThen);
        assert.ok(logged);
        assert.done();
    });
};

module.exports.error_404 = function (assert) {
    var tries = 5, tried = 0;

    osmosis.get(url + '/get-404')
    .config('ignore_http_errors', false)
    .config('tries', tries)
    .error(function (msg) {
        if (msg.indexOf('404') > -1) {
            tried++;
        }
    })
    .done(function () {
        assert.strictEqual(tries, tried);
        assert.done();
    });
};

module.exports.error_redirect = function (assert) {
    var max = 4, logged = 0, errored = 0;

    osmosis.get(url + '/error-redirect')
    .config('follow', max)
    .config('tries', 1)
    .log(function (msg) {
        if (msg.indexOf('redirect') > -1) {
            logged++;
        }
    })
    .error(function (msg) {
        if (msg.indexOf('Max redirects') > -1) {
            errored++;
        }
    })
    .done(function () {
        assert.strictEqual(logged, max);
        assert.strictEqual(errored, 1);
        assert.done();
    });
};

module.exports.error_parse = function (assert) {
    var tries = 4;

    osmosis.get(url + '/error-parse')
    .config('tries', tries)
    .error(function (msg) {
        if (msg.indexOf('empty') > -1) {
            tries--;
        }
    })
    .done(function () {
        assert.strictEqual(tries, 0);
        assert.done();
    });
};

module.exports.multiple = function (assert) {
    var totalRequests = 15,
        requests = totalRequests,
        results = [],
        done = false,
        timeout;

    while (requests--) {
        osmosis.get(url + '/get?count=' + requests)
            .set('div', 'div')
            .data(function (data) {
                var key = JSON.parse(data.div).count;

                if (results.indexOf(key) === -1) {
                    results.push(key);
                }
            })
            .done(function () {
                if (results.length === totalRequests) {
                    clearTimeout(timeout);
                    if (done === false) {
                        assert.done();
                        done = true;
                    }
                }
            });
    }

    timeout = setTimeout(function () {
        console.log(results);
        assert.equal(results.length, totalRequests);
        if (done === false) {
            assert.done();
            done = true;
        }
    }, 5000);
}

module.exports.xml = function (assert) {
  osmosis.get(url + '/xml-auto')
    .then(function (context, data) {
        assert.equal(context.get('link').text(), 'http://example.com');
    })
    .get(url + '/xml')
    .then(function (context, data) {
        // In html mode <link> tag treated as singleton tag and can't have any body
        assert.notEqual(context.get('link').text(), 'http://example.com');
    })
    .get(url + '/xml')
    .config('parse_as', 'xml')
    .then(function (context, data) {
        assert.equal(context.get('link').text(), 'http://example.com');
    })
    .done(function () {
        assert.done();
    });
};

module.exports.error_xml_parse = function (assert) {
    var tries = 4;

    osmosis.get(url + '/get')
    .config('parse_as', 'xml')
    .config('tries', tries)
    .error(function (msg) {
        // Multiply root elements are not allowed
        if (msg.indexOf('parsing error') > -1) {
            tries--;
        }
    })
    .done(function () {
        assert.strictEqual(tries, 0);
        assert.done();
    });
};

module.exports.absentQueryString = function (assert) {
    var found = false;
    osmosis.get(url + '/test-query-string')
    .then(function (document) {
        assert.strictEqual(document.location.href, 'http://' + server.host + ':' + server.port + '/test-query-string');
    })
    .find('div')
    .set({ content: 'p' })
    .data(function (data) {
      found = true
    })
    .done(function () {
        assert.ok(found);
        assert.done();
    });
};

server('/get', function (url, req, res) {
    if (url.query.redirect !== undefined) {
        res.writeHead(301, { Location: '/redirect' });
        res.end();
        return;
    }

    res.write('<p>test</p><div>' + JSON.stringify(url.query) + '</div>');
    res.end();
});

server('/get-404', function (url, req, res) {
    res.writeHead(404);
    res.end();
});

server('/error-redirect', function (url, req, res) {
    res.writeHead(301, { Location: '/error-redirect' });
    res.end();
});

server('/error-parse', function (url, req, res) {
    res.writeHead(200);
    res.end();
});

server('/xml-auto', function (url, req, res) {
  res.setHeader('Content-Type', 'application/xml');
  res.write('<rss><link>http://example.com</link></rss>');
  res.end();
});

server('/xml', function (url, req, res) {
  res.write('<rss><link>http://example.com</link></rss>');
  res.end();
});


server('/redirect', function (url, req, res) {
    res.write('<div>/redirect</div>');
    res.end();
});

server('/test-test', function (url, req, res) {
    res.write('<p>success</p>');
    res.end();
});

server('/test-query-string', function (url, req, res) {
    if (url.path === '/test-query-string?') {
        res.writeHead(404);
        res.end();
        return;
    }

    res.write('<div><p>test</p></div>');
    res.end();
});
