var osmosis = require('../index');

module.exports.stop = function(assert) {
    var instance =
    osmosis.get('yahoo.com')
    .follow('a:limit(15)')
    .done(function() {
        console.log("DONE");
        assert.done();
    })
    .log(console.log)
    .debug(console.log)
    .error(console.log)
    setTimeout(function() {
        instance.stop()
    }, 900)
}
