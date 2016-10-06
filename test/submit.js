var osmosis = require('../index');
var server = require('./server');
var fs = require('fs');
var URL = require('url');

var url = server.host + ':' + server.port;

/*
 * TODO: Add radio button tests
 *       Add input[name] case-insensitivity tests
 */

module.exports.form1 = function (assert) {
    var calledThen = false;

    osmosis.get(url + '/submit-form')
    .submit('form')
    .then(function (context) {
        calledThen = true;
        assert.deepEqual(JSON.parse(context.get('#data').text()), getInputs(1, 'sub1'));
    })
    .done(function () {
        assert.ok(calledThen);
        assert.done();
    });
};

module.exports.form2 = function (assert) {
    var calledThen = false;

    osmosis.get(url + '/submit-form')
    .submit('form[2]')
    .then(function (context) {
        calledThen = true;
        assert.deepEqual(JSON.parse(context.get('#data').text()), getInputs(2, 'sub1'));
    })
    .done(function () {
        assert.ok(calledThen);
        assert.done();
    });
};

module.exports.button = function (assert) {
    var calledThen = false;

    osmosis.get(url + '/submit-form')
    .submit('form:first [name="sub2"]')
    .then(function (context) {
        calledThen = true;
        assert.deepEqual(JSON.parse(context.get('#data').text()), getInputs(1, 'sub2'));
    })
    .done(function () {
        assert.ok(calledThen);
        assert.done();
    });
};

module.exports.form_attr = function (assert) {
    var calledThen = false;
    var inputs = getInputs(1);

    inputs['sub2'] = 'Submit Query';
    osmosis.get(url + '/submit-form')
    .submit('form[2] [name="sub2"]')
    .then(function (context) {
        calledThen = true;
        assert.deepEqual(JSON.parse(context.get('#data').text()), inputs);
    })
    .done(function () {
        assert.ok(calledThen);
        assert.done();
    });
};

module.exports.multipart = function (assert) {
    var calledThen = false;

    osmosis.get(url + '/submit-form')
    .submit('form[2] [name="sub3"]', { image: { file: __dirname + '/submit.js', content_type: 'application/javascript' } })
    .then(function (context) {
        calledThen = true;
        assert.equal(context.get('div').text(), 'success');
    })
    .done(function () {
        assert.ok(calledThen);
        assert.done();
    });
};

function getInputs(form, submit) {
    var obj = {},
        input,
        exclude = exclude || [];

    inputs = (form === 2) ?
              inputs2 :
              inputs1;

    for (input in inputs) {
        if (input.substr(0, 3) === 'sub' && input !== submit) {
            continue;
        }

        if (inputs[input].value === undefined) {
            continue;
        }

        obj[input] = inputs[input].value;
    }

    return obj;
}

var inputs1 = {
    's1': {
        html: '<select name="s1"><option value="1">one</option><option value="2" selected>two</option></select>',
        value: '2'
    },
    's2': {
        html: '<select name="s2"><option value="1">one</option><option selected>two</option></select>',
        value: 'two'
    },
    'cb1': {
        html: '<input type="checkbox" name="cb1" value="one" /><input type="checkbox" name="cb1" value="two" />',
        value: undefined
    },
    'cb2': {
        html: '<input type="checkbox" name="cb2" value="one" /><input type="checkbox" name="cb2" value="two" checked />',
        value: 'two'
    },
    'cb3[0]': {
        html: '<input type="checkbox" name="cb3" value="one" checked />',
        value: 'one'
    },
    'cb3[1]': {
        html: '<input type="checkbox" name="cb3" checked />',
        value: 'on'
    },
    'cb3[2]': {
        html: '<input type="checkbox" name="cb3[]" checked />',
        value: 'on'
    },
    'it': {
        html: '<input type="text" name="disabled" disabled />',
        value: undefined
    },
    'ta': {
        html: '<textarea name="ta">text area test</textarea>',
        value: 'text area test'
    },
    'sub1': {
        html: '<input type="submit" name="sub1" value="submit" />',
        value: 'submit'
    },
    'sub2': {
        html: '<input type="submit" name="sub2" value="Submit 2" />',
        value: 'Submit 2'
    }
};

var inputs2 = {
    'it1': {
        html: '<input type="text" name="it1" value="test" />',
        value: 'test'
    },
    'sub2': {
        html: '<input type="submit" form="form1" name="sub2" />',
        value: 'Submit Query'
    },
    'sub1': {
        html: '<button type="submit" name="sub1" value="button" />',
        value: 'button'
    },
    'sub3': {
        html: '<button type="submit" name="sub3" form="form2" formmethod="POST" formaction="/form-multipart" formenctype="multipart/form-data" value="3" />',
        value: '3'
    }
};

server('/submit-form', function (url, req, res, data) {
    res.setHeader("Content-Type", "text/html");
    var out = '';

    if (data || Object.keys(url.query).length !== 0) {
        out += '<div id="url">' + url.href + '</div>';
        out += '<div id="method">' + req.method + '</div>';
        out += '<div id="data">' + JSON.stringify(data || url.query) + '</div>';
    } else {
        out += '<form id="form1" method="POST">';

        for (var key in inputs1) {
            out += inputs1[key].html;
        }

        out += '</form>';
        out += '<form id="form2" method="GET">';

        for (var key in inputs2) {
            out += inputs2[key].html;
        }

        out += '</form>';
    }

    res.end(out);
});

server('/form-multipart', function (url, req, res, data) {
    res.setHeader("Content-Type", "text/html");
    var out = 'success';

    if (req.method !== 'POST')
        out = req.method;
    else if (req.headers['content-type'].indexOf('multipart/form-data') !== 0)
        out = JSON.stringify(req.headers);
    else if (!data)
        out = 'no data';
    else if (data.toString().indexOf('Content-Disposition: form-data') === -1)
        out = data;
    res.end('<div>' + out + '</div>');
});
