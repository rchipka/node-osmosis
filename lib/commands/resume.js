/**
 * Resume an Osmosis instance.
 *
 * @function resume
 * @memberof Command
 * @instance
 */

module.exports = function () {
    this.instance.stack.pop();
    var instance = this.instance;

    this.prev.debug('resuming');
    this.instance.paused = false;
    this.instance.resume();
};
