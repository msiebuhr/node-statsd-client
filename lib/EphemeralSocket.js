var dgram = require('dgram');

/*global console*/

function EphemeralSocket(options) {
    options = options || {};

    this._hostname = options.host || 'localhost';
    this._port = options.port || 8125;
    this._debug = options.debug || false;
    this._socketTimeoutSecs = 'socketTimeout' in options ? options.socketTimeout : 1000;

    // Set up re-usable socket
    this._socket = undefined; // Store the socket here
    this._socketUsed = false; // Flag if it has been used
    this._socketTimer = undefined; // Reference to check-timer
}

/*
 * Check if the socket has been used in the previous socketTimeout-interval.
 * If it has, we leave it open and try again later. If it hasn't, close it.
 */
EphemeralSocket.prototype._socketTimeout = function () {
    // Is it already closed? -- then stop here
    if (!this._socket) {
        return;
    }

    // Has been used? -- reset use-flag and wait some more
    if (this._socketUsed) {
        this._socketUsed = false;
        return;
    }

    // Not used? -- close the socket
    this.close();
};


/*
 * Close the socket, if in use and cancel the interval-check, if running.
 */
EphemeralSocket.prototype.close = function () {
    if (!this._socket) {
        return;
    }

    // Cancel the running timer
    clearInterval(this._socketTimer);

    // Wait a tick or two, so any remaining stats can be sent.
    setTimeout(this.kill.bind(this), 10);
};

/* Kill the socket RIGHT NOW.
 */
EphemeralSocket.prototype.kill = function () {
    if (!this._socket) {
        return;
    }

    // Clear the timer and catch any further errors silently
    clearInterval(this._socketTimer);
    this._socket.on('error', function () {});

    this._socket.close();
    this._socket = undefined;
};

EphemeralSocket.prototype._createSocket = function (callback) {
    var that = this;
    if (this._socket) {
        return callback();
    }

    this._socket = dgram.createSocket('udp4');

    // Listen on 'error'-events, so they don't bubble up to the main
    // application. Try closing the socket for now, forcing it to be re-created
    // later.
    this._socket.once('error', this.kill.bind(this));

    // Call on when the socket is ready.
    this._socket.once('listening', function () {
        return callback();
    });
    this._socket.bind(0, null);

    // Start timer, if we have a positive timeout
    if (this._socketTimeoutSecs > 0) {
        this._socketTimer = setInterval(this._socketTimeout.bind(this), this._socketTimeoutSecs);
    }
};

/*
 * Send data.
 */
EphemeralSocket.prototype.send = function (data) {
    // If we don't have a socket, or we have created one but it isn't
    // ready yet, we need to enqueue data to send once the socket is ready.
    var that = this;

    this._createSocket(function () {
        that._socketUsed = true;

        // Create message
        var message = new Buffer(data);

        if (that._debug) {
            console.warn(message.toString());
        }

        that._socket.send(message, 0, message.length, that._port, that._hostname);
    });
};

module.exports = EphemeralSocket;
