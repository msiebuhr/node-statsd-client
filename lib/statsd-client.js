var EphemeralSocket = require('./EphemeralSocket');

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

    // Figure out which socket to use
    if (this.options._socket) {
        // Re-use given socket
        this._socket = this.options._socket;
    } else if (this.options.host && this.options.host.match(/^http(s?):\/\//i)) {
        // Starts with 'http://', then create a HTTP socket
        this._socket = new (require('./HttpSocket'))(this.options);
    } else {
        // Fall back to a UDP ephemeral socket
        this._socket = new (require('./EphemeralSocket'))(this.options);
    }
}

/*
 * Get a "child" client with a sub-prefix.
 */
StatsDClient.prototype.getChildClient = function (extraPrefix) {
    return new StatsDClient({
        prefix: this.options.prefix + extraPrefix,
        _socket: this._socket
    });
};

/*
 * gauge(name, value)
 */
StatsDClient.prototype.gauge = function (name, value) {
    this._socket.send(this.options.prefix + name + ":" + value + "|g");
};

StatsDClient.prototype.gaugeDelta = function (name, delta) {
    var sign = delta >= 0 ? "+" : "-";
    this._socket.send(this.options.prefix + name + ":" + sign + Math.abs(delta) + "|g");
};

/*
 * set(name, value)
 */
StatsDClient.prototype.set = function (name, value) {
    this._socket.send(this.options.prefix + name + ":" + value + "|s");
};

/*
 * counter(name, delta)
 */
StatsDClient.prototype.counter = function (name, delta) {
    this._socket.send(this.options.prefix + name + ":" + delta + "|c");
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

    this._socket.send(this.options.prefix + name + ":" + t + "|ms");
};

/*
 * Close the socket, if in use and cancel the interval-check, if running.
 */
StatsDClient.prototype.close = function () {
    this._socket.close();
};

/*
 * Return an object with available helpers.
 */
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
