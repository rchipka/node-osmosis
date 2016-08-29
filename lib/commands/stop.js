/**
 * Stop an Osmosis instance.
 *
 * @function stop
 * @memberof Command
 * @instance
 */

module.exports = function () {
    this.instance.queue.pop();
    this.pause();
    this.instance.stopped = true;
    this.instance.paused = true;
    this.debug('stopping');
};
