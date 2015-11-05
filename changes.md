# Changelog

## 0.1.0 (next release)

 * Add `.listen()` for easily creating DOM event listeners
 * Add `.trigger()` for easily triggering DOM events
 * Add `.do()` to call one or more command using the current context
 * Add `.save()` to save response data to a file
 * Add `.is()`, `.contains()`, `.match()` for command chain logic?
 * Switch to semantic versioning?

#### `get`

 * Accepts a URL string using "%{dataKey}" to access `data` and "${selector}" to access `context`.

## 0.0.9 (current release)

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
