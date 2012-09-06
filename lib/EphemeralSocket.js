var dgram = require('dgram');

/*global console*/

function ephemeralSocket(options) {
    this.options = options || {};

    this.options.host = this.options.host || 'localhost';
    this.options.port = this.options.port || 8125;
    this.options.debug = this.options.debug || false;
    this.options.socket_timeout = this.options.socket_timeout || 1000;

    // Set up re-usable socket
    this._socket = undefined; // Store the socket here
    this._socket_used = false; // Flag if it has been used
    this._socket_timer = undefined; // Reference to check-timer
}

/*
 * Check if the socket has been used in the previous socket_timeout-interval.
 * If it has, we leave it open and try again later. If it hasn't, close it.
 */
ephemeralSocket.prototype._socket_timeout = function () {
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
 * Close the socket, if in use and cancel the interval-check, if running.
 */
ephemeralSocket.prototype.close = function () {
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
};

/*
 * Send data.
 */
ephemeralSocket.prototype.send = function (data) {
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
    var message = new Buffer(data);

    if (this.options.debug) {
        console.warn(message.toString());
    }

    this._socket.send(message, 0, message.length, this.options.port, this.options.host);
};

module.exports = ephemeralSocket;
