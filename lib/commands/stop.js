/**
 * Stop an Osmosis instance.
 */

module.exports = function () {
    this.instance.stack.pop();
    this.pause();
    this.instance.stopped = true;
    this.instance.paused = true;
    this.debug('stopping');
};
