var http = require('http');

/*global console*/

function HttpSocket(options) {
    options = options || {};

    this._hostname = options.host || 'localhost';
    this._port = options.port || 8125;
    this._debug = options.debug || false;
    this._socketTimeoutMsec = 'socketTimeout' in options ? options.socketTimeout : 1000;

    // HTTP stuffs
    this._headers = options.headers || {};
    this._path = options.path || '/';

    this._maxBufferSize = 'maxBufferSize' in options ? options.maxBufferSize : 10000;

    // Set up re-usable socket
    this._socketTimer = undefined; // Reference to check-timer
    this._buffer = "";
}

HttpSocket.prototype.log = function (messages) {
    //console.log.apply(null, arguments);
};

/* Checks if there is anything in it's buffer that need to be sent. If it is
 * non-empty, it will be flushed.
 */
HttpSocket.prototype._socketTimeout = function () {
    this.log("_socketTimeout()");
    // Flush the buffer, if it contain anything.
    if (this._buffer.length > 0) {
        this._flushBuffer();
        return;
    }
};


/*
 * Flush all current data and stop any timers running.
 */
HttpSocket.prototype.close = function () {
    this.log("close()");
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
HttpSocket.prototype.kill = function () {
    this.log("kill()");

    // Clear the timer and catch any further errors silently
    if (this._socketTimer) {
        clearInterval(this._socketTimer);
        this._socketTimer = undefined;
    }
};

/* Buffer management
 */
HttpSocket.prototype._enqueue = function (data) {
    this.log("_enqueue(", data, ")");

    if (!this._socketTimer) {
        this._socketTimer = setInterval(this._socketTimeout.bind(this), this._socketTimeoutMsec);
    }

    // Empty buffer if it's too full
    if (this._buffer.length + data.length > this._maxBufferSize) {
        this._flushBuffer();
    }

    if (this._buffer.length === 0) {
        this._buffer = data;
    } else {
        this._buffer += "\n" + data;
    }
};

HttpSocket.prototype._flushBuffer = function () {
    this.log("_flushBuffer() →", this._buffer);
    this._send(this._buffer);
    this._buffer = "";
};

/* Send data - public interface.
 */
HttpSocket.prototype.send = function (data) {
    this.log("send(", data, ")");
    if (this._maxBufferSize === 0) {
        return this._send(data);
    } else {
        this._enqueue(data);
    }
};

/*
 * Send data.
 */
HttpSocket.prototype._send = function (data) {
    this.log("_send(", data, ")");
    // If we don't have a socket, or we have created one but it isn't
    // ready yet, we need to enqueue data to send once the socket is ready.
    var that = this;

    var req = http.request({
        method: 'PUT',
        hostname: this._hostname,
        path: this._path,
        port: this._port,
        headers: this._headers
    });

    // Catch but ignore errors
    req.on('error', function () {});

    // Send data
    req.end(data);

    if (that._debug) { console.warn(data); }
};

module.exports = HttpSocket;