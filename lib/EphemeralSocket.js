var setTimeout = require('timers').setTimeout;
var clearTimeout = require('timers').clearTimeout;
var Buffer = require('buffer').Buffer;
var console = require('console');
var globalDgram = require('dgram');

var DNSResolver = require('./dns-resolver.js');

var PacketQueue = require('./packet-queue.js');

function ephemeralSocket(options) {
    var self = this;
    var opts = self.options = options || {};
    var queueOptions = opts.packetQueue;

    opts.host = opts.host || 'localhost';
    opts.port = opts.port || 8125;
    //TODO remove debug flag.
    opts.debug = opts.debug || false;

    opts.socket_timeout = 'socket_timeout' in opts ?
        opts.socket_timeout : 1000;
    opts.highWaterMark = opts.highWaterMark || 100;

    // Set up re-usable socket
    self._socket = null; // Store the socket here
    self._queue = PacketQueue(onFlush, queueOptions);
    self._socket_used = false; // Flag if it has been used
    self._socket_timer = undefined; // Reference to check-timer
    self._dnsResolver = null;
    self._dgram = opts.dgram || globalDgram;

    // flush the packet queue
    function onFlush(buf) {
        self._writeToSocket(buf);
    }
}

/*
 * Allocate a dnsResolver to resolve the hosts to an IP.
 *
 */
ephemeralSocket.prototype.resolveDNS = function (opts) {
    this._dnsResolver = new DNSResolver(this.options.host, opts);

    this._dnsResolver.lookupHost();
};

/*
 * Check if the socket has been used in the previous socket_timeout-interval.
 * If it has, we leave it open and try again later. If it hasn't, close it.
 */
ephemeralSocket.prototype._socket_timeout = function () {
    // Is it already closed? -- then stop here
    //TODO logger.warn() about not closing socket on timeout
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
    //TODO logger.warn() about closing socket on timeout
    this.close();
};


/*
 * Close the socket, if in use and cancel the interval-check, if running.
 */
ephemeralSocket.prototype.close = function () {
    this._queue.destroy();
    //TODO logger.warn() about double close()
    if (!this._socket) {
        return;
    }

    // Cancel the running timer
    clearTimeout(this._socket_timer);

    if (this._dnsResolver) {
        this._dnsResolver.close();
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
    allocSocket(this);
    this._socket_used = true;

    // Create buffer
    var buf = new Buffer(data);

    //TODO remove debug feature
    if (this.options.debug) {
        console.warn(data);
    }

    if (!this._socket._sendQueue ||
        this._socket._sendQueue.length < this.options.highWaterMark
    ) {
        //TODO logger.warn() if no _dnsResolver
        var host = this._dnsResolver ?
            this._dnsResolver.resolveHost() :
            this.options.host;

        this._socket.send(buf, 0, buf.length,
            this.options.port, host);
    }
    //TODO logger.warn() in else statement
};

module.exports = ephemeralSocket;

function allocSocket(self) {
    //TODO  mark EphemeralSocket as healthy or unhealthy based
    //TODO      on how often we allocate sockets.
    //TODO  If EphemeralSocket is unhealthy we should stop
    //TODO      calling _writeToSocket() and wait until
    //TODO      it is healthy.
    //TODO  i.e. wrap in airlock.
    if (self._socket) {
        return;
    }

    //TODO  instrument _socket creation so we know how often
    //TODO      we allocate sockets
    self._socket = self._dgram.createSocket('udp4');
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
        //TODO logger.error() about socket error
        self._socket.close();
        self._socket = null;
    }
}
