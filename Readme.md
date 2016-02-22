#Osmosis

HTML/XML parser and web scraper for NodeJS.

[![NPM](https://nodei.co/npm/osmosis.png)](https://www.npmjs.com/package/osmosis)

[![Build Status](https://travis-ci.org/rc0x03/node-osmosis.svg)](https://travis-ci.org/rc0x03/node-osmosis)

##Features

- Uses native libxml C bindings
- Clean promise-like interface
- Supports CSS 3.0 and XPath 1.0 hybrids in a single selector
- Powerful JQuery-like [CSS extensions](https://github.com/rc0x03/node-libxmljs-dom/wiki/XCSS---Selector-Intro)
- No large dependencies like jQuery, cheerio, or jsdom
- Supports deep and complex data structures

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

##Example: scrape all craigslist listings

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

For documentation and examples check out [https://github.com/rc0x03/node-osmosis/wiki](https://github.com/rc0x03/node-osmosis/wiki)

##Dependencies

- [libxmljs-dom](https://github.com/rc0x03/libxmljs-dom) - DOM wrapper for [libxmljs](https://github.com/polotek/libxmljs) C bindings
- [needle](https://github.com/tomas/needle) - Lightweight HTTP wrapper

##Donate
Donations will accelerate development and improve the quality and stability of this project.

###Donation offers:

 - $15 - A custom Osmosis scraper to extract the data you need efficiently and in as few lines of code as possible.
 - $25/month - Become a sponsor. Your company will be listed on this page. Priority support and bug fixes.

[![Donate](https://www.paypalobjects.com/en_US/i/btn/btn_donate_LG.gif)](https://www.paypal.com/cgi-bin/webscr?item_name=node-osmosis&cmd=_donations&business=NAXMWBMWKUWUU)
