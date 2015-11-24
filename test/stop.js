var osmosis = require('../index');

module.exports.stop = function(assert) {
    var instance =
    osmosis.get('yahoo.com')
    .follow('a')
    .done(function() {
        assert.ok(true)
        assert.done();
    })
    setTimeout(function() {
        instance.stop()
    }, 300)
}
