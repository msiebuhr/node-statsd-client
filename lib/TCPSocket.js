var net = require('net');
var debug = require('util').debuglog('statsd-client');

/*global console*/

function TCPSocket(options) {
    options = options || {};

    this._hostname = options.host || 'localhost';
    this._port = options.port || 8125;
    this._flushBufferTimeout = 'socketTimeout' in options ? options.socketTimeout : 1000;
    this._timeoutsToClose = 'socketTimeoutsToClose' in options ? options.socketTimeoutsToClose : 10; // close socket if not used in 10 flush intervals

    // Check https://github.com/etsy/statsd/#multi-metric-packets for advisable sizes.
    this._maxBufferSize = 'maxBufferSize' in options ? options.maxBufferSize : 1200;

    // Set up re-usable socket
    this._socket = undefined; // Store the socket here
    this._socketUsed = false; // Flag if it has been used
    this._socketLastUsed = 0; // How many intervals of timeout since socket has been used
    this._socketTimer = undefined; // Reference to check-timer
    this._buffer = [];
}

/* Dual-use timer.
 *
 * First checks if there is anything in it's buffer that need to be sent. If it
 * is non-empty, it will be flushed. (And thusly, the socket is in use and we
 * stop checking further right away).
 *
 * If there is nothing in the buffer and the socket hasn't been used in the
 * previous interval, close it.
 */
TCPSocket.prototype._socketTimeout = function _socketTimeout() {
    debug("close()");
    // Flush the buffer, if it contain anything.
    if (this._buffer.length > 0) {
        this._flushBuffer();
        return;
    }

    // Is it already closed? -- then stop here
    if (!this._socket) {
        return;
    }

    // Not used?
    if (this._socketUsed === false) {
        this._socketLastUsed++;
        // if not used in many intervals, close it
        if (this._socketLastUsed >= this._timeoutsToClose) {
            this.close();
            return;
        }
    } else {
        this._socketLastUsed = 0;
    }

    // Reset whether its been used
    this._socketUsed = false;
    // Start timer, if we have a positive timeout
    if (this._flushBufferTimeout > 0 && !this._socketTimer) {
        this._socketTimer = setInterval(this._socketTimeout.bind(this), this._flushBufferTimeout);
    }
};


/*
 * Close the socket, if in use and cancel the interval-check, if running.
 */
TCPSocket.prototype.close = function close() {
    debug("close()");
    if (!this._socket) {
        return;
    }

    if (this._buffer.length > 0) {
        this._flushBuffer();
    }

    // Cancel the running timer
    if (this._socketTimer) {
        clearInterval(this._socketTimer);
        this._socketTimer = undefined;
    }

    // Wait a tick or two, so any remaining stats can be sent.
    setTimeout(this.kill.bind(this), 10);
};

/* Kill the socket RIGHT NOW.
 */
TCPSocket.prototype.kill = function kill() {
    debug("kill()");
    if (!this._socket) {
        return;
    }

    // Clear the timer and catch any further errors silently
    if (this._socketTimer) {
        clearInterval(this._socketTimer);
        this._socketTimer = undefined;
    }
    this._socket.on('error', function () {});

    this._socket.end();
    this._socket = undefined;
};

TCPSocket.prototype._createSocket = function _createSocket(callback) {
    debug("_createSocket()");
    if (this._socket) {
        return callback();
    }

    this._socket = net.Socket({
        type: 'tcp4'
    });


    // Listen on 'error'-events, so they don't bubble up to the main
    // application. Try closing the socket for now, forcing it to be re-created
    // later.
    this._socket.once('error', this.kill.bind(this));

    // Call on when the socket is ready.
    this._socket.connect(this._port, this._hostname, function() {
        return callback();
    });

    // Start timer, if we have a positive timeout
    if (this._flushBufferTimeout > 0 && !this._socketTimer) {
        this._socketTimer = setInterval(this._socketTimeout.bind(this), this._flushBufferTimeout);
    }
};

/* Buffer management
 */
TCPSocket.prototype._enqueue = function _enqueue(data) {
    debug("_enqueue(", data, ")");

    if (!this._socketTimer) {
        this._socketTimer = setInterval(this._socketTimeout.bind(this), this._flushBufferTimeout);
    }
    // Empty buffer if it's too full
    if (this._buffer.reduce(function(sum, line) { return sum + line.length; }, 0) > this._maxBufferSize) {
        this._flushBuffer();
    }

    this._buffer.push(data);
};

TCPSocket.prototype._flushBuffer = function _flushBuffer() {
    debug("_flushBuffer() →", this._buffer);
    var that = this;
    this._send(this._buffer, function() {
        that._buffer = [];
    });
};

/* Send data - public interface.
 */
TCPSocket.prototype.send = function send(data) {
    debug("send(", data, ")");
    if (this._maxBufferSize === 0) {
        return this._send([data], function() {});
    } else {
        this._enqueue(data);
    }
};

/*
 * Send data.
 */
TCPSocket.prototype._send = function _send(data, callback) {
    debug("_send(", data, ")");
    // If we don't have a socket, or we have created one but it isn't
    // ready yet, we need to enqueue data to send once the socket is ready.
    var that = this;

    //Must be asynchronous
    this._createSocket(that._writeToSocket.bind(that, data, callback));
};

TCPSocket.prototype._writeToSocket = function _writeToSocket(data, callback) {
    // Create message
    // Trailing \n important because socket.write will sometimes concat multiple 'write' calls.
    var message = new Buffer(data.join('\n') + '\n');

    debug(message.toString());
    if (this._socket) {
        this._socketUsed = true;
        this._socket.write(message);
    }

    callback();
};

module.exports = TCPSocket;
