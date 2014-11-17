var EphemeralSocket = require('./EphemeralSocket');

/*
 * Set up the statsd-client.
 *
 * Requires the `hostname`. Options currently allows for `port` and `debug` to
 * be set.
 */
function StatsDClient(options) {
    this.options = options || {};

    // Set defaults
    this.options.prefix = this.options.prefix || "";

    // Prefix?
    if (this.options.prefix && this.options.prefix !== "") {
        // Add trailing dot if it's missing
        var p = this.options.prefix;
        this.options.prefix = p[p.length] === '.' ? p : p + ".";
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
    this._ephemeralSocket._writeToSocket(this.options.prefix + name + ":" + value + "|g");
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

module.exports = StatsDClient;
