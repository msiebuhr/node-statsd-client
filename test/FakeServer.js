/* A small fake UDP-server.
 */
var dgram = require('dgram');

function FakeServer(options) {
    options = options || {};
    this.port = options.port || 8125;

    this._socket = undefined;
    this._packetsReceived = [];
    this._expectedPackets = [];
}

/* Start the server and listen for messages.
 */
FakeServer.prototype.start = function (cb) {
    var that = this;
    this._socket = dgram.createSocket('udp4');

    this._socket.on('message', function (msg, rinfo) {
        //console.warn("Server got:", msg.toString());
        that._packetsReceived.push(msg.toString());
        that.checkMessages();
    });

    this._socket.on("listening", cb);

    this._socket.bind(this.port);
};

/* Expect `message` to arrive and call `cb` if/when it does.
 */
FakeServer.prototype.expectMessage = function (message, cb) {
    var that = this;
    this._expectedPackets.push({
        message: message,
        callback: cb
    });
    process.nextTick(function () {
        that.checkMessages();
    });
};

/* Check for expected messages.
 */
FakeServer.prototype.checkMessages = function () {
    var that = this;
    this._expectedPackets.forEach(function (details, detailIndex) {
        // Is it in there?
        var i = that._packetsReceived.indexOf(details.message);
        if (i !== -1) {
            // Remove message and the listener from their respective lists
            that._packetsReceived.splice(i, 1);
            that._expectedPackets.splice(detailIndex, 1);
            return details.callback();
        }
    });
};

module.exports = FakeServer;
