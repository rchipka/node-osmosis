var fs       = require('fs'),
    testPath = __dirname + '/tests/',
    tests    = fs.readdirSync(testPath),
    server   = require('./server'),
    cycles   = 500;

function Timer(callback) {
    this.events = [];
    this.callback = callback;

    return this;
}

Timer.prototype.start = function () {
    this.events.push({
        name: 'start',
        time: ms(),
        duration: 0
    });
};

Timer.prototype.done = function (name) {
    var event = {},
        length = this.events.length,
        prev = this.events[length - 1];

    event.name     = name;
    event.time     = ms();
    event.duration = event.time - prev.time;

    this.events.push(event);
};

Timer.prototype.stop = function () {
    var event = {
            name: 'stop',
            time: ms()
        },
        stop = this.events[0];

    event.duration = event.time - stop.time;

    this.events.push(event);
    this.callback.call(this);
};

function ms() {
    return (new Date()).getTime();
}

(function loadTest(i) {
    var test = require(testPath + tests[i]);

    loadBenchmark(test, Object.keys(test), 0, function () {
        if (++i < tests.length) {
            loadTest(i);
        } else {
            testsFinished();
        }
    });
})(0);

function loadBenchmark(benchmark, keys, index, done) {
    var name = keys[index];

    console.log("Starting " + name + " - " + cycles + " cycles");
    runBenchmark(name, benchmark[name], function () {
        if (keys.length < ++index) {
            loadBenchmark(benchmark, keys, index, done);
        } else {
            done();
        }
    }, []);
}

function runBenchmark(name, start, done, array) {
    start(new Timer(function () {
        var total = 0;

        array.push(this.events[this.events.length - 1].duration);

        if (array.length === cycles) {
            array.forEach(function (duration) {
                total += duration;
            });
            console.log("Timing (" + name + "): " + (total / array.length) + 'ms');
            done();
        } else {
            runBenchmark(name, start, done, array);
        }
    }), server.url);
}

function testsFinished() {
    server.close();
}
