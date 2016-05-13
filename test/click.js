var osmosis = require('../index'),
    server = require('./server'),
    URL = require('url'),
    url = server.host + ':' + server.port;

process.on('uncaughtException', function (err) {
    console.error(err.stack);
});

module.exports.ajax = function (assert) {
    osmosis.get(url)
    .click('.ajax')
    .then(function (context) {
        assert.ok(context.get('.ajax').text() == 'loaded');
    })
    .done(function () {
        assert.done();
    });
};

module.exports.script = function (assert) {
    osmosis.get(url)
    .click('div')
    .then(function (context) {
        assert.ok(context.get('div').text() === 'clicked');
    })
    .done(function () {
        assert.done();
    });
};

server('/', function (url, req, res) {
    res.setHeader("Content-Type", "text/html");
    res.write('<script src="/click.js"></script><div>not clicked</div><p class="ajax"></p>');
    res.end();
});

server('/ajax', function (url, req, res) {
    res.setHeader("Content-Type", "text/html");
    res.write('loaded');
    res.end();
});


server('/click.js', function (url, req, res) {
    res.setHeader("Content-Type", "text/javascript");
    res.write('(' + (function () {
        var div = document.querySelector('div');

        div.addEventListener('click', function () {
            div.innerHTML = 'clicked';
        });

        var xmlhttp = new XMLHttpRequest();
        var ajax = document.querySelector('.ajax');

        ajax.addEventListener('click', function () {
            xmlhttp.open("GET", "/ajax", true);
            xmlhttp.send();
        });

        xmlhttp.onreadystatechange = function () {
            if (xmlhttp.readyState == 4 && xmlhttp.status == 200) {
                ajax.innerHTML = xmlhttp.responseText;
            }
        };
    }).toString() + ')(window)');
    res.end();
});
