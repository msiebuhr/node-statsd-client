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
    this.options.socket_timeout = this.options.socket_timeout || 1000;

    // Set up re-usable socket
    this.socket = undefined;
    this.socket_used = false;
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

StatsDClient.prototype._socket_timeout = function () {
    // Is it already closed? -- then stop here
    if (!this.socket) {
        return;
    }

    // Has been used? -- reset use-flag and wait some more
    if (this.socket_used) {
        this.socket_used = false;
        setTimeout(this._socket_timeout.bind(this), this.options.socket_timeout);
        return;
    }

    // Not used? -- close the socket
    this.socket.close();
    this.socket = undefined;
};

/*
 * Send data - and have an optional callback.
 */
StatsDClient.prototype._send = function (data) {
    // Create socket if it isn't there
    if (!this.socket) {
        this.socket = dgram.createSocket('udp4');
        setTimeout(this._socket_timeout.bind(this), this.options.socket_timeout);
    }
    this.socket_used = true;

    var message = new Buffer(data);

    if (this.options.debug) {
        console.warn(message.toString());
    }

    this.socket.send(message, 0, message.length, this.options.port, this.host);
};

module.exports = StatsDClient;
