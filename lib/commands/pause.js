/**
 * Pause an Osmosis instance.
 *
 * @function pause
 * @memberof Command
 * @instance
 */

module.exports = function () {
    this.instance.stack.push();
    this.prev.debug('pausing');
    this.instance.paused = true;
};
