var osmosis = require('../index'),
    server  = require('./server'),
    url     = server.host + ':' + server.port;


module.exports.process_response_default_none = function (assert) {
    test_process_response(
        '/response-code-200', 'hi', undefined, assert,
        false
    );
};

module.exports.process_response_fail_on_200 = function (assert) {
    test_process_response(
        '/response-code-200', undefined, '200-die', assert,
        function(d, r, n, c) { r.statusCode === 200 ? c('200-die') : n(d); }
        );
};
module.exports.process_response_fail_on_incomplete_html = function (assert) {
    test_process_response(
        '/response-code-no-body-end', undefined, 'no-body-end', assert,
        function(d, r, n, c) { d.toString('utf8').indexOf('</body>') === -1 ? c('no-body-end') : n(d); }
        );
};
module.exports.process_response_bold_to_italic = function (assert) {
    test_process_response(
        '/response-bold-hi', '<body><i>hi</i></body>', undefined, assert,
        function(d, r, n) { n(d.toString('utf8').replace(/b>/g, 'i>')); }
    );
};
module.exports.process_response_bold_to_italic_sync = function (assert) {
    test_process_response(
        '/response-bold-hi', '<body><i>hi</i></body>', undefined, assert,
        function(d) { return d.toString('utf8').replace(/b>/g, 'i>'); }
        );
};

function test_process_response(req_url, expected_data, expected_error, assert, process_response_option) {
    var result_data, result_error;
    var opts = {parse: false};
    if (process_response_option) {
        opts.process_response = process_response_option;
    }
    osmosis
        .get(url + req_url)
        .config(opts)
        .then(function (data) {
            result_data = data.toString('utf8');
        })
        .error(function (error) {
            result_error = error;
        })
        .done(function () {
            assert.equal(result_data, expected_data);
            assert.ok(result_error == expected_error || result_error.indexOf(expected_error) > -1);
            assert.ok(true);
            assert.done();
        });
}

server('/response-code-200', function (url, req, res) {
    res.writeHead(200);
    res.end('hi');
});
server('/response-bold-hi', function (url, req, res) {
    res.writeHead(200);
    res.end('<body><b>hi</b></body>');
});
server('/response-code-no-body-end', function (url, req, res) {
    res.writeHead(200);
    res.end('<body>but no end body');
});
