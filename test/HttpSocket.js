/* Test the Http socket
 */

var HttpSocket = require('../lib/HttpSocket'),
    http = require('http'),
    MessageCollector = require('./messageCollector'),
    assert = require('chai').assert;

/*global describe before it after*/

describe('HttpSocket', function () {
    var s, e, messages;

    before(function (done) {
        e = new HttpSocket({ host: 'http://localhost:8125' });

        messages = new MessageCollector();
        s = http.createServer(function (req, res) {
            req.setEncoding('ascii');
            var m = '';
            req.on('data', function (data) {
                m += data;
            });
            req.on('end', function (data) {
                if (data) { m += data; }
                messages.addMessage(m);
                res.end();
            });
        });
        s.listen(8125, undefined, undefined, done);
    });

    after(function () {
        s.close();
    });

    it("Respects host-configuration", function (done) {
        var w = new HttpSocket({host: 'some_other_host.sbhr.dk'});
        w.send('wrong_message');

        setTimeout(function () {
            assert.lengthOf(messages._packetsReceived, 0);
            done();
        }, 25);
    });

    it("Sends data immediately with maxBufferSize = 0", function (done) {
        var withoutBuffer = new HttpSocket({maxBufferSize: 0, host: 'http://localhost:8125'}),
            start = Date.now();

        withoutBuffer.send('do_not_buffer');

        messages.expectMessage('do_not_buffer', function (err) {
            assert.closeTo(Date.now() - start, 0, 25);
            withoutBuffer.close();
            done();
        }, 500);
    });

    it("Doesn't send data immediately with maxBufferSize > 0", function (done) {
        var withBuffer = new HttpSocket({socketTimeout: 25, host: 'http://localhost:8125'});
        withBuffer.send('buffer_this');
        var start = Date.now();

        messages.expectMessage('buffer_this', function (err) {
            assert.operator(Date.now() - start, '>=', 25);
            withBuffer.close();
            done(err);
        });
    });

    it("Send 500 messages", function (done) {
        this.slow(500);

        // Send messages
        for (var i = 0; i < 500; i += 1) {
            e.send('foobar' + i);
        }
        e.close();

        setTimeout(function () {
            // Received some packets
            assert.closeTo(
                messages._packetsReceived.length,
                500, // Should get 500
                5 // ±5
            );
            messages._packetsReceived = [];
            return done();
        }, 25);
    });
});
