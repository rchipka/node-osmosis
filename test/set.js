var osmosis = require('../index'),
    server  = require('./server'),
    URL     = require('url'),
    fs      = require('fs'),
    expected = {
        title: "TITLE",
        content: "CONTENT",
        innerHTML: '<meta http-equiv="Content-Type" ' +
                   'content="text/html; charset=UTF-8"><title>TITLE</title>',
        source: '<title>TITLE</title>',
        object: {
            id: 'content'
        },
        array:
           ['TITLE',
            { first_link: '/1' },
            'TITLE',
            'TITLE',
            { all_links: ['/1', '/2'] },
            { title: 'TITLE' }],
        find: 'CONTENT',
        find_arr: ['/1', '/2'],
        get: {
            title: "1"
        },
        follow: [
            { title: "1" },
            { title: "2" }
        ],
        follow_array: [
            "/1",
            "/2",
            { title: "1" },
            { title: "2" }
        ],
        get_follow: [
            { page: "2",
              title: "1" },
            { page: "3",
              title: "1" }
        ],
        get_nested_follow: {
            pages: [
                { page: "2" },
                { page: "3" }],
            title: "1"
        },
        then: { called: true },
        then_multiple: [1, 2, 3],
        then_none: {},
        //then_none_done: [{}, {}],
        then_new_context: 'TITLE',
        then_new_data: [1, 2, 3]
    },
    expected_array_root = [
          '/1',
          '/2',
          { href: '/1', name: '1' },
          { href: '/2', name: '2' },
          [[['/1']]]
    ],
    expected_callbacks = {
        links: [
            { url: '/1', link: 1 },
            { url: '/2', link: 2 }
        ],
        page2: { title: 2 }
    },
    url = server.host + ':' + server.port;

module.exports.array_root = function (assert) {
    var calledThen = false, calledData = false;

    osmosis.get(url + '/set')
    .set([
        'a@href',
        osmosis.find('a').set('name').set('href', '@href'),
        [[['a:first@href']]]
    ])
    .then(function (context, data) {
        calledThen = true;
        assert.ok(Array.isArray(data));
    })
    .data(function (data) {
        calledData = true;
        assert.deepEqual(data, expected_array_root);
    })
    .done(function () {
        assert.ok(calledThen);
        assert.ok(calledData);
        assert.done();
    });
};

module.exports.callbacks = function (assert) {
    var calledThen = false, calledData = false;

    osmosis.get(url + '/set')
    .set({
        links: osmosis.find('a')
                .set('link', function (link) {
                    return parseInt(link.innerHTML);
                })
                .set('url', function (link) {
                    return link.getAttribute("href");
                }),
        page2: osmosis.get(function (doc) {
            return doc.querySelector('a:last');
        }).set('title', 'title')
    })
    .then(function () {
        calledThen = true;
    })
    .data(function (data) {
        calledData = true;
        assert.deepEqual(data, expected_callbacks);
    })
    .done(function () {
        assert.ok(calledThen);
        assert.ok(calledData);
        assert.done();
    });
};

module.exports.nested = function (assert) {
    var calledThen = false, calledData = false;

    osmosis.get(url + '/set')
    .set({
        title: 'title',
        content: '#content',
        fake: 'fake-selector',
        innerHTML: 'head:html',
        source: 'title:source',
        object: {
            id: 'div@id',
            fake: 'fake-selector'
        },
        array: [
            'title',
            { first_link: 'a:first@href' },
            osmosis.find('title'),
            osmosis.then(function (context, data, next) {
                next(context.get('title'), data);
            }),
            { all_links: ['a@href'] },
            osmosis.find('title').set('title')
        ],
        find: osmosis.find('div'),
        find_arr: osmosis.find('a@href'),
        get: osmosis.get('/1').set({ title: 'title' }),
        get_fail: osmosis.get('/notfound').set({ title: 'title' }),
        follow: osmosis.follow('a').set({ title: 'title' }),
        follow_fail: osmosis.follow('fake-selector').set({ title: 'title' }),
        follow_array: [
            'a@href',
            'fake-selector',
            osmosis.follow('a').set({ title: 'title' })
        ],
        get_follow:
            osmosis('/1')
            .set({ title: 'title' })
            .follow('a')
            .set({ page: 'title' }),
        get_nested_follow: osmosis.get('/1').set({
            title: 'title',
            pages: osmosis.follow('a').set({ page: 'title' })
        }),
        then: osmosis.then(function (context, data, next) {
            data.called = true;
            next(context, data);
        }),
        then_multiple: osmosis.then(function (context, data, next, done) {
            var i = 1;

            data.called = true;

            for (; i <= 3; i++) {
                next(context, i);
            }

            done();
        }),
        then_new_data: osmosis.then(function (context, data, next) {
            next(context, [1, 2, 3]);
        }),
        then_new_context: osmosis.then(function (context, data, next) {
            next(context.get('title'), data);
        }),
        then_none: osmosis.then(function () {
        })
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
    .then(function (context, data, next) {
        calledThen = true;
        assert.equal(context, context.doc());
        next(context, data);
    })
    .data(function (data) {
        calledData = true;
        assert.deepEqual(data, expected);
    })
    .done(function () {
        assert.ok(calledThen);
        assert.ok(calledData);
        assert.done();
    });
};

server('/set', function (url, req, res) {
    res.setHeader("Content-Type", "text/html");
    res.write('<head><title>TITLE</title></head><body>' +
              '<div id="content">CONTENT</div>' +
              '<a href="/1">1</a><a href="/2">2</a></body>');
    res.end();
});

server('/1', function (url, req, res) {
    res.setHeader("Content-Type", "text/html");
    res.write('<head><title>1</title></head>' +
              '<body><a href="/2"></a><a href="/3"></a></body>');
    res.end();
});

server('/2', function (url, req, res) {
    res.setHeader("Content-Type", "text/html");
    res.write('<head><title>2</title></head><body></body>');
    res.end();
});

server('/3', function (url, req, res) {
    res.setHeader("Content-Type", "text/html");
    res.write('<head><title>3</title></head><body></body>');
    res.end();
});
