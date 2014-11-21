var EphemeralSocket = require('./EphemeralSocket');
var Messages = require('./messages.js');


/*
 * Set up the statsd-client.
 *
 * Requires the `hostname`. Options currently allows for `port` and `debug` to
 * be set.
 */
function StatsDClient(options) {
    this.options = options || {};

    // Set defaults
    this.options.prefix = this.options.prefix || '';

    // Prefix?
    if (this.options.prefix && this.options.prefix !== '') {
        // Add trailing dot if it's missing
        var p = this.options.prefix;
        this.options.prefix = p[p.length - 1] === '.' ?
            p : p + '.';
    }

    // Ephemeral socket
    this._ephemeralSocket = this.options._ephemeralSocket ||
        new EphemeralSocket(options);

    if (this.options.dnsResolver &&
        this._ephemeralSocket.resolveDNS
    ) {
        this._ephemeralSocket.resolveDNS(
            this.options.dnsResolver);
    }
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
    name = this.options.prefix + name;
    var message = new Messages.Gauge(name, value);
    this._ephemeralSocket._writeToSocket(message.toString());
};

/*
 * counter(name, delta)
 */
StatsDClient.prototype.counter = function (name, delta) {
    name = this.options.prefix + name;
    var message = new Messages.Counter(name, delta);
    this._ephemeralSocket.send(message.toString());
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

    name = this.options.prefix + name;
    var message = new Messages.Timing(name, t);
    this._ephemeralSocket.send(message.toString());
};

/*
 * Close the socket, if in use and cancel the interval-check, if running.
 */
StatsDClient.prototype.close = function () {
    this._ephemeralSocket.close();
};

module.exports = StatsDClient;
