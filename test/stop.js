var osmosis = require('../index');

module.exports.stop = function(assert) {
    var instance =
    osmosis.get('yahoo.com')
    .follow('a:limit(15)')
    .done(function() {
        assert.ok(true)
        assert.done();
    })
    setTimeout(function() {
        instance.stop()
    }, 300)
}
