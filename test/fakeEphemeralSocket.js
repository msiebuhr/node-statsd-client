function FakeEphemeralSocket(options) {
    this.sent_messages = [];
}

FakeEphemeralSocket.prototype.close = function () { };

FakeEphemeralSocket.prototype.send = function (data) {
    this.sent_messages.push(data);
};

module.exports = FakeEphemeralSocket;
