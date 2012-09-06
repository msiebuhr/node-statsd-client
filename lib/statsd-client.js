var EphemeralSocket = require('./EphemeralSocket'),
    ProxyStream = require('./ProxyStream');

/*
 * Set up the statsd-client.
 *
 * Requires the `hostname`. Options currently allows for `port` and `debug` to
 * be set.
 */
function StatsDClient(options) {
    this.options = options || {};
    this._helpers = undefined;

    // Set defaults
    this.options.prefix = this.options.prefix || "";

    // Prefix?
    if (this.options.prefix && this.options.prefix !== "") {
        // Add trailing dot if it's missing
        var p = this.options.prefix;
        this.options.prefix = p[p.length - 1] === '.' ? p : p + ".";
    }

    // Ephemeral socket
    this._ephemeralSocket = this.options._ephemeralSocket || new EphemeralSocket(options);
}

/*
 * Get a "child" client with a sub-prefix.
 */
StatsDClient.prototype.getChildClient = function (extraPrefix) {
    return new StatsDClient({
        prefix: this.options.prefix + extraPrefix,
        _ephemeralSocket: this._ephemeralSocket
    });
};

/*
 * gauge(name, value)
 */
StatsDClient.prototype.gauge = function (name, value) {
    this._ephemeralSocket.send(this.options.prefix + name + ":" + value + "|g");
};

/*
 * counter(name, delta)
 */
StatsDClient.prototype.counter = function (name, delta) {
    this._ephemeralSocket.send(this.options.prefix + name + ":" + delta + "|c");
};

/*
 * increment(name, [delta=1])
 */
StatsDClient.prototype.increment = function (name, delta) {
    this.counter(name, Math.abs(delta || 1));
};

/*
 * decrement(name, [delta=-1])
 */
StatsDClient.prototype.decrement = function (name, delta) {
    this.counter(name, -1 * Math.abs(delta || 1));
};

/*
 * timings(name, date-object | ms)
 */
StatsDClient.prototype.timing = function (name, time) {
    // Date-object or integer?
    var t = time instanceof Date ? new Date() - time : time;

    this._ephemeralSocket.send(this.options.prefix + name + ":" + t + "|ms");
};

/*
 * Close the socket, if in use and cancel the interval-check, if running.
 */
StatsDClient.prototype.close = function () {
    this._ephemeralSocket.close();
};

/*
 * Hook the given listeners into `stream`. If no stream is given, an empty
 * proxy-stream with listeners implemented is returned, so that can be piped
 * from/to.
 */
StatsDClient.prototype._hookIntoStream = function (listeners, stream) {
    stream = stream || new ProxyStream();

    // Mount known listeners on the stream.
    ['data', 'end', 'error', 'close']
        .filter(function (listener) {
            return listener in listeners;
        })
        .forEach(function (listener) {
            stream.on(listener, function (arg) {
                listeners[listener](arg);
            });
        });

    return stream;
};


StatsDClient.prototype.measureStreamSize = function (key, stream) {
    var that = this;
    return this._hookIntoStream({
        data: function (data) {
            that.increment(key, data.length);
        }
    }, stream);
};

StatsDClient.prototype.measureStreamLatency = function (key, stream) {
    var startTime,
        that = this;
    return this._hookIntoStream({
        data: function (data) {
            startTime = startTime || new Date();
        },
        end: function () {
            if (startTime) {
                that.timing(key, startTime);
            }
        }
    }, stream);
};

StatsDClient.prototype.measureStreamBandwidth = function (key, stream) {
    var startTime,
        that = this,
        size = 0;
    return this._hookIntoStream({
        data: function (data) {
            startTime = startTime || new Date();
            size = size + data.length;
        },
        end: function () {
            if (startTime) {
                var time = (new Date() - startTime) || 1;
                that.timing(key, size / time);
            }
        }
    }, stream);
};

StatsDClient.prototype.__defineGetter__('helpers', function () {
    if (!(this._helpers)) {
        var helpers = {},
            that = this,
            files = require('fs').readdirSync(__dirname + '/helpers');

        files.forEach(function (filename) {
            if (/\.js$/.test(filename) && filename !== 'index.js') {
                var name = filename.replace(/\.js$/, '');
                helpers[name] = require('./helpers/' + filename)(that);
            }
        });
        this._helpers = helpers;
    }

    return this._helpers;
});

module.exports = StatsDClient;
