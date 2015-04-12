var parser = null;
var url = require('url');
var vm = require('vm');

var dom = function(context) {
    this.document.documentElement = new Element(context);
    this.globals = ['globals', 'window', 'document', 'location', 'console'];
    this.window.global = this.window;
    this.window.window = this.window;
    this.window.document = this.document;
    this.window.location = url.parse(context.request.url);
}

var noop = function() {};

dom.prototype.window = {
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
    alert: function(m) { console.log(m) },
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
    createDocumentFragment: function() {
        return this.documentElement;
    },
    addEventListener: function(ev, cb) {
        console.log(ev);
        if (ev.indexOf('load')) cb();
    },
    removeEventListener: noop,
    createElement: function(name) {
        return new Element((new parser.libxml.Element(this.documentElement.context, name)))
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
    }
};
dom.prototype.history = {};
dom.prototype.screen = {};
dom.prototype.navigator = {};
dom.prototype.console = console;

var Element = function(context) {
    this.context = context;
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
        if (ev.indexOf('load')) cb();
    },
    appendChild: function(child) {
        if (this.context.addChild === undefined)
            return new Element(this.context.get('body').addChild(child.context));
        else
            return new Element(this.context.addChild(child.context));
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
        return new Element(this.context.clone())
    },
    compareDocumentPosition: noop,
    contains: noop,
    contentEditable: null,
    dir: null,
    firstChild: null,
    firstElementChild: null,
    focus: noop,
    getAttribute: noop,
    getAttributeNode: noop,
    getElementsByClassName: noop,
    getElementsByTagName: noop,
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
    nodeName: function() {
        return this.context.name();
    },
    nodeType: null,
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
    var context = vm.createContext(window);
    var script = vm.createScript(code, { filename: 'DOM.exec()' });
    script.runInContext(context);
    extend(this.window, context);
    parser.stack--;
}

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