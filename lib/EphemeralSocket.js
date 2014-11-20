var setTimeout = require('timers').setTimeout;
var clearTimeout = require('timers').clearTimeout;
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

    self.options.socket_timeout = self.options.socket_timeout || 1000;
    self.options.highWaterMark = self.options.highWaterMark || 100;

    // Set up re-usable socket
    self._socket = null; // Store the socket here
    self._queue = PacketQueue(onFlush, queueOptions);
    self._socket_used = false; // Flag if it has been used
    self._socket_timer = undefined; // Reference to check-timer

    // flush the packet queue
    function onFlush(buf) {
        self._writeToSocket(buf);
    }
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
    this._queue.destroy();
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

ephemeralSocket.prototype.send = function (data) {
    this._queue.write(data);
}

/*
 * Send data.
 */
ephemeralSocket.prototype._writeToSocket = function (data) {
    // Create socket if it isn't there
    allocSocket(this);
    this._socket_used = true;

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

function allocSocket(self) {
    if (self._socket) {
        return;
    }

    self._socket = dgram.createSocket('udp4');
    self._socket.unref();

    // Start timer, if we have a positive timeout
    if (self.options.socket_timeout > 0) {
        self._socket_timer = setTimeout(
            self._socket_timeout.bind(self),
            self.options.socket_timeout
        );
    }

    self._socket.once('error', onError);

    // When we error we should just close and de-allocate.
    function onError(err) {
        self._socket.close();
        self._socket = null;
    }
}
