var setTimeout = require('timers').setTimeout;
var Buffer = require('buffer').Buffer;
var console = require('console');
var dgram = require('dgram');

var PacketQueue = require('./packet-queue.js');

function ephemeralSocket(options) {
    var self = this;
    self.options = options || {};
    var queueOptions = self.options.packetQueue;

    self.options.host = self.options.host || 'localhost';
    self.options.port = self.options.port || 8125;
    self.options.debug = self.options.debug || false;
    self.options.highWaterMark = self.options.highWaterMark || 100;

    // Set up re-usable socket
    self._socket = undefined; // Store the socket here
    self._queue = PacketQueue(onFlush, queueOptions);

    // flush the packet queue
    function onFlush(buf) {
        self._writeToSocket(buf);
    }
}

/*
 * Close the socket, if in use and cancel the interval-check, if running.
 */
ephemeralSocket.prototype.close = function () {
    this._queue.destroy();
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

ephemeralSocket.prototype.send = function (data) {
    this._queue.write(data);
}

/*
 * Send data.
 */
ephemeralSocket.prototype._writeToSocket = function (data) {
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
