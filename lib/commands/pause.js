/**
 * Pause an Osmosis instance.
 *
 * @function pause
 * @memberof Command
 * @instance
 */

module.exports = function () {
    this.instance.queue.push();
    this.prev.debug('pausing');
    this.instance.paused = true;
};
