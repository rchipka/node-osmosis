# Changelog

#### TODO:

 * Add `.learn()` to generate a selector for a selected node
 * Add `.listen()` for easily creating DOM event listeners
 * Add `.trigger()` for easily triggering DOM events
 * Add `.on()` for binding callback to a local-only event
 * Add `.url()` to set the current URL
 * Add `.params()` to set the current URL parameters
 * Add `.save()` to save response data to a file
 * Add `.add()`, `.remove()` for node creation/deletion?
 * Add `.scroll()` to scrape infinite scroll pages
 * Add warnings for parser errors?
 * Switch to semantic versioning?

## 0.1.4

#### `get`

 * Removed `opts` and `callback` arguments

#### `set`

 * Supports an array as the root data object
 * Fixed case where nested `.find` searches the entire document

## 0.1.3

 * parseHtml uses `huge` option by default
 * Fixed nested Osmosis instances inside `set`
 * Update to `libxmljs-dom` v0.0.5

#### `set`

 * Fixed nested Osmosis instances inside `set`
 * Added tests for nested set data

#### `submit`

 * Proper `submit` button handling
 * Accepts a `submit` button selector as the first argument
 * Supports `submit` button attributes: "form", "formaction", "formenctype" and "formmethod"
 * Added tests for `submit` button handling

## 0.1.2

 * Update to `libxmljs-dom` v0.0.4

## 0.1.1

 * `proxy` option can now be an array of multiple proxies

#### `proxy`

 * Added `.proxy()` to easily set the `proxy` configuration option

#### `then`

 * If the first argument's name is:
    * "document" - The callback is given the current document
    * "window" - The callback is given the Window object
    * "$" - The callback is given a jQuery object (if available)

### Internal changes:

 * Uses 'use strict'
 * Minimize use of array.forEach
 * Added libxml specific memoryUsage monitoring
 * Switched to static `libxmljs-dom` version

## 0.1.0

 * Added `ignore_http_errors` option
 * Added `:internal` for selecting internal links
 * Added `:external` for selecting external links
 * Added `:domain` for searching by domain name
 * Added `:path` for searching by path

#### `config`

 * Configuration options are inherited down the chain

#### `contains`

 * Added `.contains(string)` to discard nodes whose contents do not match `string`

#### `do`

 * Added `.do()` to call one or more commands using the current context

#### `failure` (or `fail`)

 * Added `.failure(selector)` to discard nodes that match the given selector

#### `filter` (or `success`)

 * Added `.filter(selector)` to discard nodes that do not match the given selector

#### `get`

 * Accepts a tokenized URL string
    * @{...} - Request info (url, method, params, headers, etc.)
    * %{...} - `data` object
    * ${...} - `context` search

#### `headers` (or `header`)

* Added `headers({ key: value })` and `header(key, value)` to set HTTP headers

#### `match`

 * Added `.match([selector], RegExp)` to discard nodes whose contents do not match

#### `rewrite`

 * Added `.rewrite(callback)` to set a URL rewriting function for the preceding request

### Internal changes:

 * `promise.args` is now an object (used to be an array)
 * HTTP 400 errors are now logged and the requests are retried.

## 0.0.9

 * DOM and css2xpath functionality have been moved to `libxmljs-dom`
 * Added `keep_data` option to retain the original HTTP response
 * Added `process_response` option for processing data before parsing
 * Added test suite

#### `click`

 * Added `.click()` for interacting with JS-only content

#### `delay`

 * Added `.delay(n)` for waiting n seconds before calling next. Accepts a decimal value.

#### `find`

 * Accepts an array of selectors as the first argument

#### `follow`

 * Accepts second argument. Boolean (true = follow external links) or a URL rewriting function.

#### `get`

 * Accepts `function(context, data)` as the first argument. The function must return a URL string.

#### `parse`

 * Added second argument to associate a base-url to the document

#### `then`

 * Added optional `done` argument

#### `select`

 * Added `.select` for finding elements within the current context

#### `set`

 * Replaces previously set values

### Internal changes:

 * Enhanced stack counting
 * Added data object ref counting
 * Added domain specific cookie handling
 * Improved stability of deep instance nesting with `.set()`
 * Osmosis instances operate more independently
 * Request queues are now a single array for each instance
 * Promises must accept and call `done` if they asynchronously
   send more than one output context per input context
 * If `.then` sends more than one output context per input context,
   then it must accept `done()` as its last argument and
   call it after calling `next()` for the last time.

## 0.0.8

#### `config`

 * Ensure non-default `needle` options propagate

## 0.0.7

#### `paginate`

 * Added a more intuitive method for pagination

#### `submit`

 * Added easy form submission

#### `login`

 * Added easy login support

#### `pause`, `resume`, `stop`

 * Added pause, resume, and stop functionality

#### `find`

 * Searches the entire document by default

#### `set`

 * Supports innerHTML using `:html` or `:source` in selectors
 * Supports deep JSON structures and nested Osmosis instances

#### `data`

 * `.data(null)` clears the data object
 * `.data({})` appends keys to data object

#### `dom`

 * `.dom()` is continuing progress and can now run jQuery
