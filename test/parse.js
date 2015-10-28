var osmosis = require('../index');

var html = '<body><a href="/rel"></a></body>';

module.exports.html = function(assert) {
    osmosis.parse(html)
    .then(function(context, data) {
        assert.ok(context.find('body').length == 1)
    })
    .done(function() {
        assert.done();
    })
    .log(console.log)
    .error(console.error);
};

module.exports.base_url = function(assert) {
    osmosis.parse(html, 'test.com')
    .then(function(context, data) {
        assert.ok(!!context.request.url);
    })
    .done(function() {
        assert.done();
    })
};
