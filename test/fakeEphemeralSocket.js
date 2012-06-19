function FakeEphemeralSocket(options) {
    this.sent_messages = [];
}

FakeEphemeralSocket.prototype.close = function () { };

FakeEphemeralSocket.prototype.send = function (data) {
    this.sent_messages.push(data);
};

FakeEphemeralSocket.prototype.testAndDeleteMessage = function (message) {
    var index = this.sent_messages.indexOf(message);

    if (index !== -1) {
        this.sent_messages.splice(index, 1);
    }

    return (index !== -1);
};

module.exports = FakeEphemeralSocket;
