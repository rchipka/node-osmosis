var parser = null;
var url = require('url');
var vm = require('vm');

var dom = function(context) {
    console.log(context);
    this.document.documentContext = context;
    this.document.writeBuffer = '';
    this.document.referrer = context.request.headers.referer;
    this.document.documentElement = new Element(context.root());
    Object.defineProperty(this.document, "documentElement", { value: new Element(context.root()), writable: false });
    this.globals = ['globals', 'window', 'document', 'location', 'console'];
    this.window.global = this.window;
    this.window.window = this.window;
    this.window.location = url.parse(context.request.url);
    this.window.location.toString = function() {
        return url.format(this);
    }
    this.document.location = this.window.location;
    Object.defineProperty(this.window, "document", { value: this.document, writable: false });
    this.window.document = this.document;
}

var noop = function() {};

dom.prototype.window = {
    document: dom.document,
    history: dom.history,
    location: dom.location,
    navigator: dom.navigator,
    addEventListener: function(ev, cb) {
        console.log(ev);
        if (ev.indexOf('load')) cb();
    },
    removeEventListener: noop,
    closed: false,
    defaultStatus: '',
    frameElement: null,
    frames: [],
    innerHeight: 1000,
    innerWidth: 1000,
    length: 0,
    name: '',
    opener: null,
    outerHeight: 1000,
    outerWidth: 1000,
    pageXOffset: 0,
    pageYOffset: 0,
    parent: null,
    screen: dom.screen,
    screenLeft:0,
    screenTop:0,
    screenX:0,
    screenY:0,
    scrollX:0,
    scrollY:0,
    self: this,
    status: '',
    top: this,
    alert: function(m) { console.log('alert:', m) },
    confirm: noop,
    prompt: noop,
    atob: function(s) { return s.toString() },
    btoa: function(s) { return s.toString('base64') },
    blur: noop,
    close: noop,
    createPopup: noop,
    focus: noop,
    moveBy: noop,
    moveTo: noop,
    open: noop,
    print: noop,
    resizeBy: noop,
    resizeTo: noop,
    scroll: noop,
    scrollBy: noop,
    scrollTo: noop,
    stop: noop,
    setTimeout: setTimeout,
    setInterval: setInterval,
    clearTimeout: clearTimeout,
    clearInterval: clearInterval,
    console: console,
}

dom.prototype.document = {
    nodeType: 9,
    createDocumentFragment: function() {
        return this.documentElement;
    },
    addEventListener: function(ev, cb) {
        console.log(ev);
        if (ev.indexOf('load')) cb();
    },
    removeEventListener: noop,
    createElement: function(name) {
        console.log('creating Element', name);
        return new Element((new parser.libxml.Element(this.documentContext, name)))
    },
    querySelector: function(selector, all) {
        if (all === true)
            document.documentElement
        else
            document.documentElement.find()
    },
    title: function(str) {
        if (!str) {
        }else{
            
        }
    },
    getElementsByClassName: function(name) {
        var arr = [];
        this.documentElement.context.find(name).forEach(function(el) {
            arr.push(new Element(el));
        })
        return arr;
    },
    getElementsByTagName: function(name) {
        var arr = [];
        this.documentElement.context.find(name).forEach(function(el) {
            arr.push(new Element(el));
        })
        return arr;
    },
    getElementById: function(id) {
        return this.documentElement.get('#'+id);
    },
    write: function(data) {
        this.writeBuffer += data;
        var res = parser.libxml.parseHtml(this.writeBuffer);
        var errors = res.errors;
        var lastError = errors[errors.length-1]
        if (lastError && lastError.code === 73) { // no end tag found
            //console.log(errors);
        }else{
            var body = this.documentElement.context.get('body');
            parser.libxml.parseHtml('<body>'+this.writeBuffer+'</body>')
            .get('body').childNodes().forEach(function(child) {
                body.addChild(child);
            })
            this.writeBuffer = '';
        }
    },
    charset: 'UTF-8',
    characterSet: 'UTF-8'
};
dom.prototype.history = {};
dom.prototype.screen = {};
dom.prototype.navigator = {};
dom.prototype.console = console;
dom.prototype.XMLHttpRequest = function() {
    return this;
}
dom.prototype.XMLHttpRequest.prototype = {
    async: true,
    onreadystatechange: null,
    readyState: 0,
    responseText: null,
    responseXML: null,
    status: null,
    statusText: null,
    abort: noop(),
    getAllResponseHeaders: function() {
        
    },
    getResponseHeader: function(header) {
        
    },
    open: function(method, url, async, user, password) {
        
    },
    send: function(data) {
        
    },
    overrideMimeType: function(mime) {
        
    },
    setRequestHeader: function(header, value) {
        
    }
}

var Element = function(context) {
    this.context = context;
    //if (context.root !== undefined)
    //    this.context = context.root();
    if (this.context.name !== undefined)
    this.nodeName = this.context.name();
    this.lastChild = this;
    //if (this.lastChild !== undefined)
    //    this.lastChild = new Element(this.lastChild);
    if (this.context.attrs !== undefined)
        this.attributes = this.context.attrs();
    else
        this.attributes = [];
    if (this.context.parent !== undefined) {
        this.parentNode = new Element(this.context.parent())||this;
        this.parentElement = this.context.parent();
    }else{
        this.parentNode = this.context;
        this.parentElement = null;
    }
    return this;
}

Element.prototype = {
    accessKey: null,
    addEventListener: function(ev, cb) {
        console.log(ev);
        if (ev.indexOf('load')) cb({type: ev});
    },
    appendChild: function(child) {
        if (this.context.addChild === undefined) {
            this.context.get('body').addChild(child.context)
            return child;
        }else{
            //this.context.addChild(child.context)
            console.log("ADDCHILD", child.nodeName, this.nodeName)
            return child;
        }
    },
    removeEventListener: function(ev, cb) {
        console.log(ev);
        if (ev.indexOf('load')) cb();
    },
    setAttribute: function(name, value) {
        console.log(name,value);
        this.context.attr(name, value);
    },
    removeChild: function(child) {
        child.context.remove();
        return child;
    },
    attributes: null,
    blur: noop,
    childElementCount: null,
    childNodes: null,
    children: null,
    classList: null,
    className: null,
    click: noop,
    clientHeight: null,
    clientLeft: null,
    clientTop: null,
    clientWidth: null,
    cloneNode: function() {
        console.log('cloning '+this.nodeName)
        return new Element(this.context.clone())
    },
    compareDocumentPosition: noop,
    checked: false,
    contains: noop,
    contentEditable: null,
    dir: null,
    find: function(selector) {
        return this.context.find(selector);
    },
    get: function(selector) {
        return this.context.get(selector)||null;
    },
    firstChild: null,
    firstElementChild: null,
    focus: noop,
    getAttribute: function(name) {
        if (this.context.attr !== undefined)
            return this.context.attr(name);
        else
            return null;
    },
    getAttributeNode: noop,
    getElementsByClassName: function(name) {
        var arr = [];
        this.context.find(name).forEach(function(el) {
            arr.push(new Element(el));
        })
        return arr;
    },
    getElementsByTagName: function(name) {
        var arr = [];
        this.context.find(name).forEach(function(el) {
            arr.push(new Element(el));
        })
        return arr;
    },
    getFeature: noop,
    hasAttribute: noop,
    hasAttributes: noop,
    hasChildNodes: noop,
    id: null,
    innerHTML: null,
    insertBefore: noop,
    isContentEditable: null,
    isDefaultNamespace: noop,
    isEqualNode: noop,
    isSameNode: noop,
    isSupported: noop,
    lang: null,
    lastChild: null,
    lastElementChild: null,
    namespaceURI: null,
    nextSibling: null,
    nextElementSibling: null,
    nodeName: null,
    nodeType: 1,
    nodeValue: null,
    normalize: noop,
    offsetHeight: null,
    offsetWidth: null,
    offsetLeft: null,
    offsetParent: null,
    offsetTop: null,
    ownerDocument: null,
    previousSibling: null,
    previousElementSibling: null,
    querySelector: noop,
    querySelectorAll: noop,
    removeAttribute: noop,
    removeAttributeNode: noop,
    removeChild: noop,
    replaceChild: noop,
    removeEventListener: noop,
    scrollHeight: null,
    scrollLeft: null,
    scrollTop: null,
    scrollWidth: null,
    setAttribute: noop,
    setAttributeNode: noop,
    style: null,
    tabIndex: null,
    tagName: null,
    textContent: null,
    title: null,
    toString: function() {
        return this.context.toString();
    }
}

dom.prototype.exec = function(code, file) {
    parser.stack++;
    var window = extend({}, this.window);
    const context = vm.createContext(window);
    Object.defineProperty(context, "document", { value: window.document, writable: false });
    var script = vm.createScript(code, { filename: 'DOM.exec()' });
    script.runInContext(context);
    extend(this.window, context);
    parser.stack--;
}

dom.prototype.runCSS

function extend(obj1, obj2) {
    for (var key in obj2) {
        if (obj2.hasOwnProperty(key)) {
            obj1[key] = obj2[key];
        }
    }
    return obj1;
}

module.exports = function(p) {
    parser = p;
    return dom;
}