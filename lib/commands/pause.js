/**
 * Pause an Osmosis instance.
 */

module.exports = function () {
    this.instance.stack.push();
    this.prev.debug('pausing');
    this.instance.paused = true;
}
