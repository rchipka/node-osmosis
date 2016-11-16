/*jslint node: true */
'use strict';

var form = {};

form.submit = function () {

};

form.isForm = function (node) {
    return node.nodeName === 'form';
};

form.getForm = function (node) {
    if (form.isForm(node)) {
        return node;
    } else if (node.hasAttribute('form')) {
        return node.doc().getElementById(node.getAttribute('form'));
    } else {
        return node.get('ancestor-or-self::form');
    }
};

form.getInputs = function (node) {
    return form.getForm(node).find('[@name ' +
                            'and not(@disabled) ' +
                            'and not(@type="submit")]');
};

form.getSubmitButton = function (node) {
    if (form.isForm(node)) {
        return node.get('[@type="submit" and not(@disabled) and ' +
                        '(not(@form) or @form="' +
                            node.getAttribute('id') + '"' +
                        ')][1]');
    } else if ((node.nodeName === 'input' || node.nodeName === 'button') &&
                node.getAttribute('type') === 'submit') {
        return node;
    }

    return null;
};

form.getAction = function (node) {
    var document = node.doc();

    if (node.hasAttribute('action')) {
        return document.location.resolve(node.getAttribute('action'));
    } else if (node.hasAttribute('formaction')) {
        return document.location.resolve(node.getAttribute('formaction'));
    } else {
        return document.location.href;
    }
};

form.getEnctype = function (node) {
    if (node.hasAttribute('enctype')) {
        return node.getAttribute('enctype');
    } else if (node.hasAttribute('formenctype')) {
        return node.getAttribute('formenctype');
    }

    return 'application/x-www-form-urlencoded';
};

form.isMultipart = function (node) {
    if (node.hasAttribute === undefined) {
        return false;
    }

    return (form.getEnctype(node).substr(0, 5) === 'multi');
};

form.getMethod = function (node) {
    if (node.hasAttribute('method')) {
        return node.getAttribute('method').toLowerCase();
    } else if (node.hasAttribute('formmethod')) {
        return node.getAttribute('formmethod').toLowerCase();
    } else {
        return 'get';
    }
};

form.getParams = function (node) {
    var params = {},
        submit = form.getSubmitButton(node),
        inputs = form.getInputs(node),
        length = inputs.length,
        i = 0, input, name, nodeName, type, value;

    for (i = 0; i < length; i++) {
        input = inputs[i];
        name = input.getAttribute('name');
        type = input.getAttribute('type');
        nodeName = input.nodeName;
        value = null;

        if (name.charAt(name.length - 1) === ']') {
            name = name.substr(0, name.length - 2);
        }

        if (type) {
            type = type.toLowerCase();
        }

        switch (nodeName) {
            case 'select':
                input = input.get('option[selected]') ||
                        input.get('option:first');

                if (input !== null) {
                    if (input.hasAttribute('value')) {
                        value = input.getAttribute('value');
                    } else {
                        value = input.textContent;
                    }
                }

                break;
            case 'textarea':
                value = input.textContent;
                break;
            case 'input':
                switch (type) {
                    case 'radio':
                    case 'image':
                        ['x', 'y'].forEach(function (p) {
                            var array = [];

                            if (name) {
                                array.push(name);
                            }

                            array.push(p);

                            params[array.join('.')] = 0;
                        });
                    case 'checkbox':
                        if (!input.hasAttribute('checked'))  {
                            break;
                        }

                        name  = name.replace(/\[\]$/, '');
                        value = input.getAttribute('value') || 'on';

                        break;
                    default:
                        value = input.getAttribute('value');
                        break;

                }
                break;
        }

        if (value !== null) {
            if (params[name] instanceof Array) {
                params[name].push(value);
            } else if (params[name] !== undefined) {
                params[name] = [params[name], value];
            } else {
                params[name] = value;
            }
        }
    }

    if (submit !== null) {
        if (submit.hasAttribute('name')) {
            params[submit.getAttribute('name')] =
                submit.getAttribute('value') || 'Submit Query';
        }
    }

    return params;
};

module.exports = form;
