var test = require('tape');
var dgram = require('dgram');

var EphemeralSocket = require('../lib/EphemeralSocket.js');

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
            assert.equal(str, 'hello');

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
            assert.equal(str, 'hello');

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

            if (messages.length === 13) {
                onEnd();
            }
        }

        function onEnd() {
            assert.equal(messages, 'hello\n \nworld');

            sock.close();
            server.close();
            assert.end();
        }
    });
});

test('socket will unref', function t(assert) {
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
            assert.equal(str, 'hello');

            sock._queue.destroy();
            server.close();
            assert.end();
        }
    });
});

function UDPServer(opts, onBound) {
    opts = opts || {};
    var port = opts.port || PORT;

    var server = dgram.createSocket('udp4');
    server.bind(port, onBound);

    return server;
}
