var server = require('./server');

module.exports.server = function(assert) {
    server.close();
    assert.done();
}
