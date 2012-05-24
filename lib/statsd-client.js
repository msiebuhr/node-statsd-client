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

    // Set defaults
    this.options.port = this.options.port || 8125;
    this.options.debug = this.options.debug || false;
    this.options.socket_timeout = this.options.socket_timeout || 1000;
    this.options.prefix = this.options.prefix || "";

    // Prefix?
    if (this.options.prefix && this.options.prefix !== "") {
        // Add trailing dot if it's missing
        var p = this.options.prefix;
        this.options.prefix = p[p.length] === '.' ? p : p + ".";
    }

    // Set up re-usable socket
    this._socket = undefined; // Store the socket here
    this._socket_used = false; // Flag if it has been used
    this._socket_timer = undefined; // Reference to check-timer
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
 * Close the socket, if in use and cancel the interval-check, if running.
 */
StatsDClient.prototype.close = function () {
    if (!this._socket) {
        return;
    }

    // Cancel the running timer
    clearTimeout(this._socket_timer);

    // Wait a tick or two, so any remaining stats can be sent.
    var that = this;
    setTimeout(function () {
        that._socket.close();
        that._socket = undefined;
    }, 10);
}

/*
 * PRIVATE METHODS
 */

/*
 * Check if the socket has been used in the previous socket_timeout-interval.
 * If it has, we leave it open and try again later. If it hasn't, close it.
 */
StatsDClient.prototype._socket_timeout = function () {
    // Is it already closed? -- then stop here
    if (!this._socket) {
        return;
    }

    // Has been used? -- reset use-flag and wait some more
    if (this._socket_used) {
        this._socket_used = false;
        this._socket_timer = setTimeout(this._socket_timeout.bind(this), this.options.socket_timeout);
        return;
    }

    // Not used? -- close the socket
    this.close();
};

/*
 * Send data - and have an optional callback.
 */
StatsDClient.prototype._send = function (data) {
    // Create socket if it isn't there
    if (!this._socket) {
        this._socket = dgram.createSocket('udp4');

        // Start timer, if we have a positive timeout
        if (this.options.socket_timeout > 0) {
            this._socket_timer = setTimeout(this._socket_timeout.bind(this), this.options.socket_timeout);
        }
    }
    this._socket_used = true;

    // Create message
    var message = new Buffer(this.options.prefix + data);

    if (this.options.debug) {
        console.warn(message.toString());
    }

    this._socket.send(message, 0, message.length, this.options.port, this.host);
};

module.exports = StatsDClient;
