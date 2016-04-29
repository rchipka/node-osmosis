/**
 * Call a callback when the instance has completely finished.
 *
 * @function done
 * @memberof Command
 * @param {function} - Callback
 */

 function Done(cb) {
    if (typeof cb === 'function') {
        this.done = cb;
    } else if (this.next !== undefined) {
        this.next.done();
    }

    return this;
}

module.exports = Done;
