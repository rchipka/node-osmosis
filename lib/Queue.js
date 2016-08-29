'use strict';

/**
 * An Osmosis request queue.
 *
 * @constructor Queue
 * @protected
 * @param {object} instance - parent instance
 * @returns Command
 */

function Queue(instance) {
    this.instance = instance;
    this.opts = instance.opts;
    this.queue = [];
}

Queue.prototype = {
    change:     0,
    count:      0,
    done:       0,
    requests:   0,
    length:     0,
    enqueue: function (object) {
        this.queue[this.length++] = object;
    },
    dequeue: function () {
        var object = this.queue[--this.length];

        this.queue[this.length] = null;

        return object;
    },
    push: function () {
        if (++this.change >= 25) {
            if (this.instance.resources !== null) {
                this.instance.resources();
            }

            this.change = 0;
        }

        return ++this.count;
    },
    pop: function () {
        var self = this;

        if (--self.count === 0) {
            process.nextTick(function () {
                var instance;

                if (self.count === 0) {
                    instance = self.instance;
                    instance.command.done();

                    if (instance.opts.debug === true) {
                        instance.resources();
                    }
                }
            });
        }

        this.change++;

        return this.count;
    }
};

module.exports = Queue;
