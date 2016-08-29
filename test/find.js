var osmosis = require('../index'),
    server = require('./server'),
    URL = require('url'),
    url = server.host + ':' + server.port;

module.exports.selector_array = function (assert) {
    var count = 0;

    osmosis.get(url + '/find')
    .find(['img', 'b'])
    .then(function () {
        count++;
    })
    .done(function () {
        assert.equal(count, 7);
        assert.done();
    });
};

module.exports.selector_css = function (assert) {
    var count = 0;

    osmosis.get(url + '/find')
    .find('.content ul:not([name]) li[2] b:last img')
    .then(function (context) {
        assert.ok(++count == context.getAttribute('src'));
    })
    .done(function () {
        assert.equal(count, 3);
        assert.done();
    });
};

module.exports.nested = function (assert) {
    var calledThen = true;

    osmosis.get(url + '/find')
    .find('ul:last')
    .set({
        'b': osmosis.find('b')
    })
    .then(function (context, data) {
        calledThen = true;
        assert.equal(data.b.length, 3);
    })
    .done(function () {
        assert.ok(calledThen);
        assert.done();
    });
};

module.exports.select = function (assert) {
    var count = 0;

    osmosis.get(url + '/find')
    .find('ul:last > li:last')
    .select('b')
    .then(function () {
        count++;
    })
    .done(function () {
        assert.equal(count, 2);
        assert.done();
    });
};

module.exports.xpath = function (assert) {
    var count = 0;

    osmosis.get(url + '/find')
    .find('//div[@class]/ul[2]/li')
    .then(function () {
        count++;
    })
    .done(function () {
        assert.equal(count, 2);
        assert.done();
    });
};

module.exports.both = function (assert) {
    var count = 0;

    osmosis.get(url + '/find')
    .find('.content//preceding::[@name]')
    .then(function () {
        count++;
    })
    .done(function () {
        assert.equal(count, 1);
        assert.done();
    });
};

server('/find', function (url, req, res) {
    res.setHeader("Content-Type", "text/html");
    res.write('<body>\
                <div class="content">\
                    <ul name="test">\
                        <li><b>first</b></li>\
                    </ul>\
                    <ul>\
                        <li><b>one</b></li>\
                        <li>\
                            <b>two</b><b>three <img src="1" />, <img src="2" />, <img src="3" /></b>\
                        </li>\
                    </ul>\
                </div>\
               </body>');
    res.end();
});
