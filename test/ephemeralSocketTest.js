/* Test the Ephemeral socket
 */

var StatsDClient = require('../lib/statsd-client'),
    FakeServer = require('./FakeServer'),
    assert = require('chai').assert;

/*global describe before it*/

describe('EphemeralSocket', function () {
    var s, c;

    before(function (done) {
        s = new FakeServer();
        c = new StatsDClient({
            //debug: true
        });

        s.start(done);
    });

    it("Send 50 messages", function (done) {
        for (var i = 0; i < 50; i += 1) {
            c.gauge('foobar', i);
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
});
