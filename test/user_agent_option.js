var osmosis = require('../index'),
    server  = require('./server'),
    url     = server.host + ':' + server.port;

module.exports.user_agent_as_function = function (assert) {
    var testUserAgent = function () {return 'UserAgent As Function';};
    test_user_agent(testUserAgent, testUserAgent(), assert);
};

module.exports.user_agent_as_string = function (assert) {
    var testUserAgent = 'UserAgent As String';
    test_user_agent(testUserAgent, testUserAgent, assert);
};
function test_user_agent(ua_req, ua_test, assert) {
    var ua_via_response = false;
    osmosis
        .get(url + '/return-user-agent')
        .config({user_agent: ua_req})
        .find('b')
        .then(function (context) {
            ua_via_response = context.textContent;
        })
        .done(function () {
            assert.equal(ua_test, ua_via_response);
            assert.ok(true);
            assert.done();
        });
}

server('/return-user-agent', function (url, req, res) {
    res.end('<body><b>' + req.headers["user-agent"] + '</b></body>');
});
