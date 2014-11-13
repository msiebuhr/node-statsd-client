var test = require('tape');
var setTimeout = require('timers').setTimeout;

var UDPServer = require('./lib/udp-server.js');
var EphemeralSocket = require('../lib/EphemeralSocket.js');
var StatsDClient = require('../lib/statsd-client.js');

var PORT = 8125;

test('creates a socket', function t(assert) {
    var sock = new EphemeralSocket({
        host: 'localhost',
        port: PORT,
        packetQueue: { flush: 10 }
    });

    assert.equal(typeof sock.close, 'function');
    assert.equal(typeof sock.send, 'function');

    sock.close();
    assert.end();
});

test('can write to socket', function t(assert) {
    var server = UDPServer({ port: PORT }, function onBound() {
        var sock = new EphemeralSocket({
            host: 'localhost',
            port: PORT,
            packetQueue: { flush: 10 }
        });

        server.once('message', onMessage);
        sock.send('hello');

        function onMessage(msg) {
            var str = String(msg);
            assert.equal(str, 'hello\n');

            sock.close();
            server.close();
            assert.end();
        }
    });
});

test('has default ports & hosts', function t(assert) {
    var server = UDPServer({ port: PORT }, function onBound() {
        var sock = new EphemeralSocket({
            packetQueue: { flush: 10 }
        });

        server.once('message', onMessage);
        sock.send('hello');

        function onMessage(msg) {
            var str = String(msg);
            assert.equal(str, 'hello\n');

            sock.close();
            server.close();
            assert.end();
        }
    });
});

test('can send multiple packets', function t(assert) {
    var server = UDPServer({ port: PORT }, function onBound() {
        var sock = new EphemeralSocket({
            host: 'localhost',
            port: PORT,
            packetQueue: { flush: 10 }
        });
        var messages = '';

        server.on('message', onMessage);
        sock.send('hello');
        sock.send(' ');
        sock.send('world');

        function onMessage(msg) {
            messages += msg;

            if (messages.length === 14) {
                onEnd();
            }
        }

        function onEnd() {
            assert.equal(messages, 'hello\n \nworld\n');

            sock.close();
            server.close();
            assert.end();
        }
    });
});

test('socket will close and timeout', function t(assert) {
    var server = UDPServer({ port: PORT }, function onBound() {
        var sock = new EphemeralSocket({
            host: 'localhost',
            port: PORT,
            socket_timeout: 10,
            packetQueue: { flush: 10 }
        });

        server.once('message', onMessage);
        sock.send('hello');

        function onMessage(msg) {
            var str = String(msg);
            assert.equal(str, 'hello\n');

            setTimeout(expectClosed, 50);
        }

        function expectClosed() {
            assert.equal(sock._socket, undefined);

            server.close();
            assert.end();
        }
    });
});

test('writing to a bad host does not blow up', function t(assert) {
    var sock = new EphemeralSocket({
        host: 'lol.example.com',
        port: PORT,
        socket_timeout: 0
    });

    sock.send('hello');

    setTimeout(function () {
        assert.equal(sock._socket, null);
        assert.end();
    }, 50);
});

test('client.gauge()', function t(assert) {
    var server = UDPServer({ port: PORT }, function onBound() {
        var sock = new StatsDClient({
            host: 'localhost',
            port: PORT,
            packetQueue: { flush: 10 }
        });

        server.once('message', onMessage);
        sock.gauge('hello', 10);

        function onMessage(msg) {
            var str = String(msg);
            assert.equal(str, 'hello:10|g');

            sock.close();
            server.close();
            assert.end();
        }
    });
});


test('client.counter()', function t(assert) {
    var server = UDPServer({ port: PORT }, function onBound() {
        var sock = new StatsDClient({
            host: 'localhost',
            port: PORT,
            packetQueue: { flush: 10 }
        });

        server.once('message', onMessage);
        sock.counter('hello', 10);

        function onMessage(msg) {
            var str = String(msg);
            assert.equal(str, 'hello:10|c\n');

            sock.close();
            server.close();
            assert.end();
        }
    });
});
