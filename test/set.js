var osmosis = require('../index');
var server = require('./server');
var URL = require('url');
var fs = require('fs');

var expected = {
    title: "TITLE",
    content: "CONTENT",
    object: {
        id: 'content'
    },
    array:
       [ 'TITLE',
         { first_link: '/1' },
         'TITLE',
         'TITLE',
         { all_links: [ '/1', '/2' ] },
         { title: 'TITLE' } ],
    find: 'CONTENT',
    find_arr: [ '/1', '/2' ],
    get: {
        title: "1"
    },
    follow: [
        { title: "1" },
        { title: "2"}
    ],
    follow_array: [
        "/1",
        "/2",
        { title: "1" },
        { title: "2" }
    ],
    get_follow: [
        {
            page: "2",
            title: "1"
        },
        {
            page: "3",
            title:"1"
        }
    ],
    get_nested_follow: {
        pages: [
            {
                page:"2"
            },
            {
                page:"3"
            }
        ],
        title:"1"
    },
    then: { called: true },
    then_multiple: [1, 2, 3],
    then_none: {},
    //then_none_done: [{}, {}],
    then_new_context: 'TITLE',
    then_new_data: [1, 2, 3]
};

var url = server.host+':'+server.port;

module.exports.nested = function(assert) {
    var calledData = false;
    osmosis.get(url)
    .set({
        title: 'title',
        content: '#content',
        fake: 'fake-selector',
        object: {
            id: 'div@id',
            fake: 'fake-selector'
        },
        array: [
            'title',
            { first_link: 'a:first@href' },
            osmosis.find('title'),
            osmosis.then(function(context, data, next) {
                next(context.get('title'), data);
            }),
            { all_links: ['a@href'] },
            osmosis.find('title').set('title')
        ],
        find: osmosis.find('div'),
        find_arr: osmosis.find('a@href'),
        get: osmosis.get('/1').set({ title: 'title' }),
        get_fail: osmosis.get('/notfound').set({title: 'title'}),
        follow: osmosis.follow('a').set({ title: 'title' }),
        follow_fail: osmosis.follow('fake-selector').set({ title: 'title' }),
        follow_array: ['a@href', 'fake-selector', osmosis.follow('a').set({ title: 'title' })],
        get_follow: osmosis.get('/1').set({ title: 'title' }).follow('a').set({  page: 'title' }),
        get_nested_follow: osmosis.get('/1').set({
            title: 'title',
            pages: osmosis.follow('a').set({  page: 'title' })
        }),
        then: osmosis.then(function(context, data, next) {
            data.called = true;
            next(context, data);
        }),
        then_multiple: osmosis.then(function(context, data, next, done) {
            data.called = true;
            for (var i = 1; i <= 3; i++) {
                next(context, i);
            }
            done();
        }),
        then_new_data: osmosis.then(function(context, data, next) {
            next(context, [1, 2, 3]);
        }),
        then_new_context: osmosis.then(function(context, data, next) {
            next(context.get('title'), data);
        }),
        then_none: osmosis.then(function(context, data) {
        }),
        /*then_done_none: osmosis.then(function(context, data, next, done) {
            setTimeout(function() {
                next(context, data);
                setTimeout(function() {
                    next(context, data);
                    done();
                }, 200);
            }, 350)
        }),*/
    })
    .data(function(data) {
        calledData = true;
        assert.deepEqual(data, expected);
    })
    .done(function() {
        assert.ok(calledData);
        assert.done();
    })
}

server('/', function(url, req, res, data) {
    res.setHeader("Content-Type", "text/html");
    res.write('<head><title>TITLE</title></head><body><div id="content">CONTENT</div><a href="/1"></a><a href="/2"></a></body>')
    res.end();
})

server('/1', function(url, req, res, data) {
    res.setHeader("Content-Type", "text/html");
    res.write('<head><title>1</title></head><body><a href="/2"></a><a href="/3"></a></body>')
    res.end();
})

server('/2', function(url, req, res, data) {
    res.setHeader("Content-Type", "text/html");
    res.write('<head><title>2</title></head><body></body>')
    res.end();
})

server('/3', function(url, req, res, data) {
    res.setHeader("Content-Type", "text/html");
    res.write('<head><title>3</title></head><body></body>')
    res.end();
})
