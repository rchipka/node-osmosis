var osmosis = require('../index');
var server = require('./server');
var URL = require('url');

var url = server.host + ':' + server.port;

module.exports.link = function (assert) {
    var count = 0;

    osmosis.get(url + '/paginate')
    .paginate('a[rel="next"]', 3)
    .set('page', 'div')
    .then(function (context, data) {
        var page = context.request.params.page || 1;

        assert.equal(page, data.page);
        assert.equal(page, ++count);
    })
    .done(function () {
        assert.ok(count > 1);
        assert.done();
    });
};

module.exports.param = function (assert) {
    var count = 0;

    osmosis.get(url + '/paginate', { page: 1 })
    .paginate({ page: +1 }, 3)
    .set('page', 'div')
    .then(function (context, data) {
        var page = context.request.params.page || 1;

        assert.equal(page, data.page);
        assert.equal(page, ++count);
    })
    .done(function () {
        assert.ok(count > 1);
        assert.done();
    });
};

module.exports.form = function (assert) {
    var count = 0;

    osmosis.get(url + '/paginate')
    .paginate('form', 3)
    .set('page', 'div')
    .then(function (context, data) {
        var page = context.request.params.page || 1;

        assert.ok(page == data.page);
        assert.ok(page == ++count);
    })
    .done(function () {
        assert.ok(count > 1);
        assert.done();
    });
};

server('/paginate', function (url, req, res, data) {
    res.setHeader("Content-Type", "text/html");
    var page = 1;

    if (data && data.page)
        page = data.page;
    else if (url.query.page)
        page = url.query.page;
    res.write('<div>' + page + '</div><a href="?page=' + (parseInt(page) + 1) + '" rel="next">Next</a>\
                <form method="POST"><input type="hidden" name="page" value="' + (parseInt(page) + 1) + '"></form>');
    res.end();
});
