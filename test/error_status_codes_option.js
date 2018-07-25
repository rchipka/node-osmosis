var osmosis = require('../index'),
    server  = require('./server'),
    url     = server.host + ':' + server.port;

module.exports.error_status_codes_fail_on_200 = function (assert) {
    test_error_codes('/response-code-200', function(s) { return s === 200;}, true, assert);
};
module.exports.error_status_codes_pass_on_500 = function (assert) {
    test_error_codes('/response-code-500', function(s) { return s !== 500;}, false, assert);
};
module.exports.error_status_codes_fail_on_200_str = function (assert) {
    test_error_codes('/response-code-200', '200', true, assert);
};
module.exports.error_status_codes_fail_on_200_num = function (assert) {
    test_error_codes('/response-code-200', 200, true, assert);
};
module.exports.error_status_codes_pass_on_200 = function (assert) {
    test_error_codes('/response-code-200', false, false, assert);
};
module.exports.error_status_codes_fail_on_400 = function (assert) {
    test_error_codes('/response-code-400', false, true, assert);
};
module.exports.error_status_codes_pass_on_501 = function (assert) {
    test_error_codes('/response-code-501', false, false, assert);
};
module.exports.error_status_codes_pass_on_301 = function (assert) {
    test_error_codes('/response-code-301', false, false, assert);
};
function test_error_codes(req_url, error_status_codes, response_failed, assert) {
    var failed;
    osmosis
        .get(url + req_url)
        .config(error_status_codes ? {error_status_codes: error_status_codes} : {})
        .then(function () {
            failed = false;
        })
        .error(function () {
            failed = true;
        })
        .done(function () {
            assert.equal(failed, response_failed);
            assert.ok(true);
            assert.done();
        });
}

server('/response-code-500', function (url, req, res) {
    res.writeHead(500);
    res.end('hi');
});
server('/response-code-400', function (url, req, res) {
    res.writeHead(400);
    res.end('hi');
});
server('/response-code-200', function (url, req, res) {
    res.writeHead(200);
    res.end('hi');
});
server('/response-code-301', function (url, req, res) {
    res.writeHead(301);
    res.end('hi');
});
server('/response-code-501', function (url, req, res) {
    res.writeHead(501);
    res.end('hi');
});
