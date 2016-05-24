/**
 * Trigger a DOM event and continue once it completes.
 *
 * Note: If no selector is specified, the default event target will be
 * the Window object.
 *
 * @function trigger
 * @param {string} event - The name of the event to trigger.
 * @param {Selector} [selector] - Nodes to trigger the event on.
 * @memberof Command
 * @instance
 */

function Trigger(context, data, next, done) {
    var event = this.event, window = context.defaultView;

    window.addEventListener('done', function () {
        window.dispatchEvent(event);
        next(context, data);
        done();
    });
}

module.exports.trigger = function (event, selector) {
    this.event = event;
    this.selector = selector;
    return Trigger;
};
