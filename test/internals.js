module.exports.Data = function (assert) {
    var Data = require('../lib/Data.js'),
        parent, child;

    // Data root can be an array
    parent = (new Data()).isArray(true);
    child = parent.child().set('key', 'value');
    parent.merge(child);
    assert.deepEqual(parent.getObject(), [{ key: 'value' }]);

    parent   = (new Data()).isArray(true);

    // Child objects are pushed to an array
    parent.merge(parent.child().set('key', 'value'));

    // Child arrays are pushed to an array
    parent.merge(parent.child()
                      .isArray(true)
                      .push('val1')
                      .push('val2'));

    // Arrays should ignore keys for `.set`
    parent.merge(parent.child()
                       .isArray(true)
                       .set('key', { 'nested': 'value' }));

    // Arrays shouldn't set based on an index
    parent.merge(child.child()
                      .isArray(true)
                      .setIndex('noIndexForArrays')
                      .push('testIndex'));

    // Empty arrays shouldn't be merged
    parent.merge(child.child()
                        .isArray(true));

    // Empty objects shouldn't be merged
    parent.merge(child.child());

    // Calling `.push` should cast an object to an array
    parent.merge(child.child().set('key', 'value').push('convertedToArray'));

    assert.deepEqual(
        [
            { 'key': 'value' },
            ['val1', 'val2'],
            [
                { 'nested': 'value' }
            ],
            [
                'testIndex'
            ],
            [
                { key: 'value' },
                'convertedToArray'
            ]
        ],
        parent.getObject());


    assert.done();
};
