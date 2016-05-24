#Osmosis

HTML/XML parser and web scraper for NodeJS.

[![NPM](https://nodei.co/npm/osmosis.png)](https://www.npmjs.com/package/osmosis)

[![Build Status](https://travis-ci.org/rchipka/node-osmosis.svg)](https://travis-ci.org/rchipka/node-osmosis)

![Downloads](https://img.shields.io/npm/dm/osmosis.svg)

##Features

- Uses native libxml C bindings
- Clean promise-like interface
- Supports CSS 3.0 and XPath 1.0 selector hybrids
- [Sizzle selectors](https://github.com/jquery/sizzle/wiki#other-selectors-and-conventions),
  [Slick selectors](http://mootools.net/core/docs/1.6.0/Slick/Slick), and
  [more](https://github.com/rchipka/node-osmosis/blob/master/docs/Selectors.md)
- No large dependencies like jQuery, cheerio, or jsdom
- Compose deep and complex data structures

- HTML parser features
    - Fast parsing
    - Very fast searching
    - Small memory footprint

- HTML DOM features
    - Load and search ajax content
    - DOM interaction and events
    - Execute embedded and remote scripts
    - Execute code in the DOM

- HTTP request features
    - Logs urls, redirects, and errors
    - Cookie jar and custom cookies/headers/user agent
    - Login/form submission, session cookies, and basic auth
    - Single proxy or multiple proxies and handles proxy failure
    - Retries and redirect limits

##Example

```javascript
var osmosis = require('osmosis');

osmosis
.get('www.craigslist.org/about/sites')
.find('h1 + div a')
.set('location')
.follow('@href')
.find('header + div + div li > a')
.set('category')
.follow('@href')
.paginate('.totallink + a.button.next:first')
.find('p > a')
.follow('@href')
.set({
    'title':        'section > h2',
    'description':  '#postingbody',
    'subcategory':  'div.breadbox > span[4]',
    'date':         'time@datetime',
    'latitude':     '#map@data-latitude',
    'longitude':    '#map@data-longitude',
    'images':       ['img@src']
})
.data(function(listing) {
    // do something with listing data
})
.log(console.log)
.error(console.log)
.debug(console.log)
```

##Documentation

For documentation and examples check out [https://rchipka.github.com/node-osmosis/](https://rchipka.github.com/node-osmosis/)

##Dependencies

- [libxmljs-dom](https://github.com/rchipka/libxmljs-dom) - DOM wrapper for [libxmljs](https://github.com/polotek/libxmljs) C bindings
- [needle](https://github.com/tomas/needle) - Lightweight HTTP wrapper

##Donate

Please consider a donation if you depend on web scraping and Osmosis makes your job a bit easier.
Your contribution allows me to spend more time making this the best web scraper for Node.

###Donation offers:

 - $25 - A custom Osmosis scraper to extract the data you need efficiently and in as few lines of code as possible.
 - $25/month - Become a sponsor. Your company will be listed on this page. Priority support and bug fixes.

[![Donate](https://www.paypalobjects.com/en_US/i/btn/btn_donate_LG.gif)](https://www.paypal.com/cgi-bin/webscr?item_name=node-osmosis&cmd=_donations&business=NAXMWBMWKUWUU)


##Kitchen Sink

Here's an attempt to demonstrate most of Osmosis' functionality.

```javascript
// global settings
osmosis.config('user_agent', 'Osmosis')
osmosis.config({
    follow: 0,      // number of redirects to follow
    tries: 2,       // number of retries
    concurrency: 5, // number of concurrent requests
    proxies: ['localhost:1081', 'localhost:1082']
})

osmosis
.get('https://really-verbose-examples.com', { page: 1 }) // query params ?page=1
.config('proxy', '192.168.9.1:1080') // per request settings
.post('/admin-login', { postUser: 'me', postPass: 'secret', rememberMe: true })
.config({
    username: 'Basic Auth username',
    password: 'Basic Auth password'
})
.error((err) => console.log(`Login Error ${err}`))
.submit('.updateForm:last') // submit a form using default HTML values
.select('.formResults')     // change the current context
.set('resultStatus', '> h2.status + p')
.find('#page-forms')
.submit('form:after(form.login):not(:has(span:contains("some text")))', { // submit a form and set some values
    title:      'New Thing',
    lastStatus: (context, data) => data.resultStatus,
    id:         id => parseInt(id.getAttribute('value'))++
})
.then((document, data, next) => {
    var success = document.querySelector('div:contains("Success")');
    if (success) {
        data.lastStatus = success.querySelector('~ div:skip(2):has(h2:first-child) !+ text():ends-with(" Code")').innerHTML;
        next(document, data);
    }else{
        this.error('Form failed! Error: '+document.querySelector('.errMessage !> div@data-error'))
    }
})
.follow('#nav a[href^="/site/"]:starts-with("Search ")')
.if('div.must-authorize:not(:empty)')
    .login('me@overly-complex-site.com', 'abc123')
           .success('.success:contains("you\'re in!")')
           .fail('div:istarts-with("incorrect")')
.set({
    results: [
        osmosis.find('#results > li')
        .set('id', '@resultId')
        .filter(':not(.banner-ad)')
        .then((context, data, next, done) => {
            database.checkId(data.id, function(exists) {
                if (!exists) {
                    next(context, data);
                    done();
                }
            })
        })
        .set({
            'title':    'h3',
            'content':  '.container',
            'link':     'a:first@href',
            'tags':     [ '.tags > span' ]
            'images': [
                osmosis.find('img')
                .set({
                    'url':    '@src',
                    'width':  img => parseInt(img.getAttribute('width')),
                    'height': img => parseInt(img.getAttribute('height')),
                    'data':   osmosis.follow('@src')
                })
            ],
            'externalSite':
                osmosis.follow('a:external')
                .set({
                    'pageTitle': 'title',
                    'email':     osmosis.find('a:mailto@href').replace(/^mailto\:/, '');
                })
                .data((doc, data) => if (data.email) console.log("Got email:", data.email))
        })
    ],
    resultCount: (context, data) => data.results.length;
})
.data((data) => {
    /* data = {
        resultStatus: "...",
        lastStatus: "...",
        results: [
            {
                title:      "...",
                content:    "...",
                link:       "...",
                tags:       [ "...", "...", ... ]
                images: [
                    {
                        url:    "...",
                        width:  123,
                        height: 123,
                        data:   Buffer
                    }
                ],
                externalSite: {
                    pageTitle:  "...",
                    email:      "user@example.com"
                }
            },
            ...
        ],
        resultCount: 123,
    }
    */
})
.log(console.log)
.error(console.error)
.debug(console.error);
```
