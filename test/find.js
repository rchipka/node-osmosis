var osmosis = require('../index');
var server = require('./server');
var URL = require('url');

var url = server.host+':'+server.port;

module.exports.css = function(assert) {
    var count = 0;
    osmosis.get(url)
    .find('.content ul:not([name]) li[2] b:last img')
    .then(function(context, data) {
        assert.ok(++count == context.attr('src'))
    })
    .done(function() {
        assert.ok(count == 3);
        assert.done();
    })
}

module.exports.array = function(assert) {
    var count = 0;
    osmosis.get(url)
    .find(['img', 'b'])
    .then(function(context, data) {
        count++;
    })
    .done(function() {
        assert.ok(count == 7);
        assert.done();
    })
}

module.exports.select = function(assert) {
    var count = 0;
    osmosis.get(url)
    .find('li:last')
    .select('b')
    .then(function(context, data) {
        count++;
    })
    .done(function() {
        assert.ok(count == 2);
        assert.done();
    })
}

module.exports.xpath = function(assert) {
    var count = 0;
    osmosis.get(url)
    .find('//div[@class]/ul[2]/li')
    .then(function(context, data) {
        count++;
    })
    .done(function() {
        assert.ok(count == 2);
        assert.done();
    })
};

module.exports.both = function(assert) {
    var count = 0;
    osmosis.get(url)
    .find('.content//preceding::[@name]')
    .then(function(context, data) {
        count++;
    })
    .done(function() {
        assert.ok(count == 1);
        assert.done();
    })
};

server('/', function(url, req, res, data) {
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
})
