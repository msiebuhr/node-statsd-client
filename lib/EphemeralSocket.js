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
    clearInterval(this._socket_timer);

    // Wait a tick or two, so any remaining stats can be sent.
    var that = this;
    setTimeout(function () {
        that._socket.close();
        that._socket = undefined;
    }, 10);
};

ephemeralSocket.prototype._create_socket = function (callback) {
    var that = this;
    if (this._socket) {
        return callback();
    }

    this._socket = dgram.createSocket('udp4');

    // Call on when the socket is ready.
    this._socket.once('listening', function () {
        return callback();
    });
    this._socket.bind(0, null);

    // Start timer, if we have a positive timeout
    if (this.options.socket_timeout > 0) {
        this._socket_timer = setInterval(this._socket_timeout.bind(this), this.options.socket_timeout);
    }
};

/*
 * Send data.
 */
ephemeralSocket.prototype.send = function (data) {
    // If we don't have a socket, or we have created one but it isn't
    // ready yet, we need to enqueue data to send once the socket is ready.
    var that = this;

    this._create_socket(function () {
        that._socket_used = true;

        // Create message
        var message = new Buffer(data);

        if (that.options.debug) {
            console.warn(message.toString());
        }

        that._socket.send(message, 0, message.length, that.options.port, that.options.host);
    });
};

module.exports = ephemeralSocket;
