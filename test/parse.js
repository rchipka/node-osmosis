var osmosis = require('../index'),
    html    = '<body><a href="/rel"></a></body>';

module.exports.html = function (assert) {
    osmosis.parse(html)
    .then(function (context) {
        assert.equal(context.find('body').length, 1);
    })
    .done(function () {
        assert.done();
    });
};

module.exports.base_url = function (assert) {
    osmosis.parse(html, { baseUrl: 'test.com' })
    .then(function (document) {
        assert.ok(document.location.href);
    })
    .done(function () {
        assert.done();
    });
};
