/* A small fake UDP-server.
 */
function MessageCollector(options) {
    this._packetsReceived = [];
    this._expectedPackets = [];
}

MessageCollector.prototype.addMessage = function (msg) {
    var that = this;
    msg.toString().split('\n').forEach(function (part) {
        that._packetsReceived.push(part);
    });
    this.checkMessages();
};

/* Expect `message` to arrive and call `cb` if/when it does.
 */
MessageCollector.prototype.expectMessage = function (message, cb) {
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
MessageCollector.prototype.checkMessages = function () {
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

module.exports = MessageCollector;
