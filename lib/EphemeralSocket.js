var setTimeout = require('timers').setTimeout;
var Buffer = require('buffer').Buffer;
var console = require('console');
var dgram = require('dgram');

function ephemeralSocket(options) {
    this.options = options || {};

    this.options.host = this.options.host || 'localhost';
    this.options.port = this.options.port || 8125;
    this.options.debug = this.options.debug || false;
    this.options.highWaterMark = this.options.highWaterMark || 100;

    // Set up re-usable socket
    this._socket = undefined; // Store the socket here
}

/*
 * Close the socket, if in use and cancel the interval-check, if running.
 */
ephemeralSocket.prototype.close = function () {
    if (!this._socket) {
        return;
    }

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
        this._socket.unref();
    }

    // Create message
    var message = new Buffer(data);

    if (this.options.debug) {
        console.warn(message.toString());
    }

    if (!this._socket._sendQueue ||
        this._socket._sendQueue.length < this.options.highWaterMark
    ) {
        this._socket.send(message, 0, message.length,
            this.options.port, this.options.host);
    }
};

module.exports = ephemeralSocket;
