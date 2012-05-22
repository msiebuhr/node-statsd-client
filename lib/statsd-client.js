var dgram = require('dgram');

/*
 * Set up the statsd-client.
 *
 * Requires the `hostname`. Options currently allows for `port` and `debug` to
 * be set.
 */
function StatsDClient(host, options) {
    this.host = host;
    this.options = options || {};

    this.options.port = this.options.port || 8125;
    this.options.debug = this.options.debug || false;
};

/*
 * gauge(name, value)
 */
StatsDClient.prototype.gauge = function (name, value) {
    this._send(name + ":" + value + "|g");
};

/*
 * counter(name, delta)
 */
StatsDClient.prototype.counter = function (name, delta) {
    this._send(name + ":" + delta + "|c");
};

/*
 * increment(name, [delta=1])
 */
StatsDClient.prototype.increment = function (name, delta) {
    this.counter(name, Math.abs(delta || 1));
}

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

    this._send(name + ":" + t + "|ms");
};

/*
 * Send data - and have an optional callback.
 */
StatsDClient.prototype._send = function (data) {
    var message = new Buffer(data),
        client = dgram.createSocket('udp4');

    if (this.options.debug) {
        console.warn(message.toString());
    }

    client.send(message, 0, message.length, this.options.port, this.host, function (err, bytes) {
        client.close();
    });
};

module.exports = StatsDClient;
