/*
 * Duck-typed copy of lib/EphemeralSocket.js (basically, `.close()` and
 * `.send(data)`).
 *
 * In addition, it has `.testAndDeleteMessage(message)`, that returns if that
 * message has been given to `.send(message)`. If it is found, it is removed
 * from the list of recieved messages.
 */

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
