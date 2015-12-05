#Osmosis

HTML/XML parser and web scraper for NodeJS.

[![NPM](https://nodei.co/npm/osmosis.png)](https://www.npmjs.com/package/osmosis)

[![Build Status](https://travis-ci.org/rc0x03/node-osmosis.svg)](https://travis-ci.org/rc0x03/node-osmosis)

##Features

- Fast: uses libxml C bindings
- Clean: promise-like interface
- Flexible: supports both CSS and XPath selectors
- Lightweight: no dependencies like jQuery, cheerio, or jsdom

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

[![Donate](https://www.paypalobjects.com/en_US/i/btn/btn_donate_LG.gif)](https://www.paypal.com/cgi-bin/webscr?item_name=node-osmosis&cmd=_donations&business=NAXMWBMWKUWUU)
