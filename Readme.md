#Osmosis

HTML/XML parser and web scraper for NodeJS.

##Features

- Fast: uses libxml C bindings
- Lightweight: no dependencies like jQuery, cheerio, or jsdom
- Clean: promise based interface- no more nested callbacks
- Flexible: supports both CSS and XPath selectors
- Predictable: same input, same output, same order
- Detailed logging for every step
- Precise and natural IO flow- no setTimeout or process.nextTick
- Easy debugging with built-in stack size and memory usage reporting
- Memory leak free

##Example: scrape all craigslist listings

```javascript
var osmosis = require('osmosis');

osmosis
.get('www.craigslist.org/about/sites') 
.find('h1 + div a')
.set('location')
.follow('@href')
.find('header + table a')
.set('category')
.follow('@href')
.find('p > a')
.follow('@href', { next: '.button.next' })
.set({
    'title':        'section > h2',
    'description':  '#postingbody',
    'subcategory':  'div.breadbox > span[4]',
    'time':         'time@datetime',
    'latitude':     '#map@data-latitude',
    'longitude':    '#map@data-longitude',
    'images[]':     'img@src'
})
.data(function(listing) {
    // do something with listing data
})
```

##Install

```
npm install osmosis
```

####Options

- opts.http [object] - HTTP options given to [needle](https://github.com/tomas/needle) instance
- opts.http.timeout [int] - Timeout in milliseconds
- opts.http.proxy [string] - Forward requests through HTTP(s) proxy
- opts.http.concurrency [int] - Number of simultaneous HTTP requests
- opts.http.tries [int] - Number of tries before giving up on a request

##Promises

####.parse(string)

Parse an HTML or XML string

####.get(url, [data], [opts])

HTTP GET request

####.post(url, [data], [opts])

HTTP POST request

####.find(selector, [opts])

Find elements based on `selector` within the current context

#####opts

- next [selector or callback([next])]
    Continue to the next page from the URL found in `selector`.
    Alternatively, a callback function can provide the next page.
- stop [callback] - If callback returns true, `next` will stop.

####.follow([selector], [opts])

Follow URLs found within the element text or `attr`

####.set([args])

Find and set values for `context.data`

```javascript
// set 'title' to current element text
o.set('title')

// set 'title' to text of 'a.title'
o.set('title', 'a.title')

// set multiple
o.set({
	// set 'title' to text of 'a.title'
	'title':  'a.title',
	// set 'description' to text of 'p.description'
	'description': 'p.description',
	// set 'url' to 'a.permalink' href attribute
	'url': 'a.permalink @href',
	// set 'images[]' to the 'src' attribute of each '<img>'
	'images[]': 'img @src',
});
```

####.then(callback(next))

Calls `callback` from the context of the current element.
To continue, the callback must call `next([context])` at least once.
The `context` argument can optionally be a new context.

The `this` value of `.then` callback function is set to the current context.
The context is a libxmljs `Element` object representing the current HTML/XML element.
In addition to all of the [libxmljs `Element`](https://github.com/polotek/libxmljs/wiki/Element) functions,
each `context` also supports these functions:

* context.request(url, [data], callback(context))
* context.post(url, [data], callback(context))
* context.log(msg)
* context.debug(msg)
* context.error(msg)
* context.data [object]

#####Example: Find and follow links
```javascript
pp.then(function(next) {
	var links = this.find('a');
	this.log('found '+links.length+' links');
	links.forEach(function(link) {
		next(link);
	});
})
```

####.data(callback(data))

Get data stored in `context.data`

####.done(callback)

Calls `callback` when parsing has completely finished

####.log(callback(msg))

Call `callback` when any log messages are received

####.error(callback(msg))

Call `callback` when any error messages are received

####.debug(callback(msg))

Call `callback` when any debug messages are received

##CSS helpers

These CSS helper selectors are provided to simplify complex CSS expressions and to add jQuery-like functionality.

####:contains(string)

Select elements whose contents contain `string`

####:starts-with(string)

Select elements whose contents start with `string`

####:ends-with(string)

Select elements whose contents end with `string`

####:first

Select first element  (shortcut for `:first-of-type`)

####:first(n), :limit(n)

Select first `n` elements

####:last

Select last element (shortcut for `:last-of-type`)

####:last(n)

Select last `n` elements

####:even

Select even elements

####:odd

Select odd elements

####:skip(n), skip-first(n)

Skip first `n` elements

####:skip-last(n)

Skip last `n` elements

####:range(n1, n2)

Select `n1` through `n2` elements inclusive

####.exampleSelector[n]

Select `n`th element (shortcut for `:nth-of-type`)

####@attribute

Select `attribute`

##Dependencies

- [libxmljs](https://github.com/polotek/libxmljs) - libxml C bindings
- [needle](https://github.com/tomas/needle) - Lightweight HTTP wrapper
