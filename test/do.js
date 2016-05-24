var osmosis = require('../index'),
    html    = '<head>' +
                    '<title>test</title>' +
                '</head>' +
                '<body>' +
                    '<a href="/rel"></a>' +
                '</body>',
    expected = {
        title: 'test',
        links: ['/rel']
    };

module.exports.multiple = function (assert) {
    osmosis.parse(html)
    .do(
        osmosis.set({ 'title': 'title' }),
        osmosis.find('body').set('name', 'true').find('none'), // fails
        osmosis.set({ 'links': ['a@href'] })
    )
    .data(function (data) {
        assert.deepEqual(data, expected);
    })
    .done(function () {
        assert.done();
    });
};
