/* Test the Ephemeral socket
 */

var EphemeralSocket = require('../lib/EphemeralSocket'),
    FakeServer = require('./FakeServer'),
    assert = require('chai').assert;

/*global describe before it*/

describe('EphemeralSocket', function () {
    var s, e;

    before(function (done) {
        s = new FakeServer();
        e = new EphemeralSocket();

        s.start(done);
    });

    it("Send 50 messages", function (done) {
        this.slow(500);
        for (var i = 0; i < 50; i += 1) {
            e.send('foobar');
        }
        setTimeout(function () {
            // Received some packets
            assert.closeTo(
                s._packetsReceived.length,
                50, // Should get 100
                5 // ±10
            );
            s._packetsReceived = [];
            return done();
        }, 25);
    });

    it("Closes _socket when 'error' is emitted", function (done) {
        e._createSocket(function () {
            // Emit error, wait some and check.
            e._socket.emit('error');
            setTimeout(function () {
                assert(!e._socket, "Socket isn't closed.");
                done();
            }, 10);
        });
    });

    it("Does not crash when many errors are emitted", function (done) {
        e._createSocket(function () {
            e._socket.emit('error');
            e._socket.emit('error');
            e._socket.emit('error');

            setTimeout(function () {
                assert(!e._socket, "Socket isn't closed")
                done();
            }, 10);
        });
    });

    describe("Socket timeout", function () {
        var te;
        before(function (done) {
            te = new EphemeralSocket({
                socket_timeout: 1
            });
            te._createSocket(done);
        });

        it("Is open → sleep 10ms → closed", function (done) {
            assert(te._socket, "Socket isn't open; should be.");
            setTimeout(function () {
                assert(!te._socket, "Socket is open; shouldn't be.");
                done();
            }, 10);
        });
    });
});
