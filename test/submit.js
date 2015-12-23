var osmosis = require('../index');
var server = require('./server');
var URL = require('url');

var url = server.host+':'+server.port;

module.exports.form = function(assert) {
    osmosis.get(url+'/form')
    .submit('form')
    .then(function(context, data) {
        assert.ok(context.get('div').text() === 'success')
    })
    .done(function() {
        assert.done();
    })
}

var inputs = {
    's1': {
        html: '<select name="s1"><option value="1">one</option><option value="2" selected>two</option></select>',
        value: '2',
    },
    's2': {
        html: '<select name="s2"><option value="1">one</option><option selected>two</option></select>',
        value: 'two',
    },
    'cb1': {
        html: '<input type="checkbox" name="cb1" value="one" /><input type="checkbox" name="cb1" value="two" />',
        value: undefined,
    },
    'cb2': {
        html: '<input type="checkbox" name="cb2" value="one" /><input type="checkbox" name="cb2" value="two" checked />',
        value: 'two',
    },
    'cb3[0]': {
        html: '<input type="checkbox" name="cb3" value="one" checked />',
        value: 'one'
    },
    'cb3[1]': {
        html: '<input type="checkbox" name="cb3" checked />',
        value: 'on',
    },
    'cb3[2]': {
        html: '<input type="checkbox" name="cb3[]" checked />',
        value: 'on',
    },
    'ta': {
        html: '<textarea name="ta">text area test</textarea>',
        value: 'text area test',
    },
}

server('/form', function(url, req, res, data) {
    res.setHeader("Content-Type", "text/html");
    var out = '';
    if (data) {
        var str = 'success';
        for (var key in inputs) {
            if (inputs[key].value != data[key]) {
                str = key;
                break;
            }
        }
        out += '<div>'+str+'</div>';
    }else{
        out += '<form method="POST">';
        for (var key in inputs) {
            out += inputs[key].html;
        }
        out += '</form>';
    }
    res.end(out);
})
