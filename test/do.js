var osmosis = require('../index');

var html = '<head><title>test</title></head><body><a href="/rel"></a></body>';

module.exports.multiple = function(assert) {
    osmosis.parse(html)
    .do(
        osmosis.set({'title': 'title'}),
        osmosis.find('body').set('name', 'true').find('a'), // fail
        osmosis.set({'links': ['a@href']})
    )
    .data(function(data) {
        assert.ok(data.links[0] == '/rel');
        assert.ok(data.title, 'test');
    })
    .done(function() {
        assert.done();
    })
};
