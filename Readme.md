# Osmosis

HTML/XML parser and web scraper for NodeJS.

[![NPM](https://nodei.co/npm/osmosis.png)](https://www.npmjs.com/package/osmosis)

[![Build Status](https://travis-ci.org/rchipka/node-osmosis.svg)](https://travis-ci.org/rchipka/node-osmosis)

![Downloads](https://img.shields.io/npm/dm/osmosis.svg)

## Features

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

## Example

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

## Documentation

For documentation and examples check out [https://rchipka.github.io/node-osmosis/global.html](https://rchipka.github.io/node-osmosis/global.html)

## Dependencies

- [libxmljs-dom](https://github.com/rchipka/node-libxmljs-dom) - DOM wrapper for [libxmljs](https://github.com/libxmljs/libxmljs) C bindings
- [needle](https://github.com/tomas/needle) - Lightweight HTTP wrapper

## Donate

Please consider a donation if you depend on web scraping and Osmosis makes your job a bit easier.
Your contribution allows me to spend more time making this the best web scraper for Node.

[![Donate](https://www.paypalobjects.com/en_US/i/btn/btn_donate_LG.gif)](https://www.paypal.com/cgi-bin/webscr?item_name=node-osmosis&cmd=_donations&business=NAXMWBMWKUWUU)
