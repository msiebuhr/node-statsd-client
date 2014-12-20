var test = require('tape');
var setTimeout = require('timers').setTimeout;
var isIPv4 = require('net').isIPv4;

var UDPServer = require('./lib/udp-server.js');
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
            assert.equal(str, 'hello\n');

            sock.close();
            server.close();
            assert.end();
        }
    });
});

test('respects isDisabled', function t(assert) {
    var isDisabledBool = false;
    var server = UDPServer({ port: PORT }, function onBound() {
        var sock = new EphemeralSocket({
            host: 'localhost',
            port: PORT,
            packetQueue: { flush: 10 },
            isDisabled: function isDisabled() {
                return isDisabledBool;
            }
        });

        server.once('message', onMessage);
        sock.send('hello');

        function onMessage(msg) {
            var str = String(msg);
            assert.equal(str, 'hello\n');

            isDisabledBool = true;
            server.on('message', failure);
            sock.send('hello');

            setTimeout(next, 100);

            function failure() {
                assert.ok(false, 'unexpected message');
            }

            function next() {
                isDisabledBool = false;
                server.removeListener('message', failure);

                server.once('message', onMessage2);
                sock.send('hello');
            }

            function onMessage2(msg) {
                assert.ok(String(msg));

                end();
            }
        }

        function end() {
            sock.close();
            server.close();
            assert.end();
        }
    });
});

test('has default ports & hosts', function t(assert) {
    var server = UDPServer({ port: PORT }, function onBound() {
        var sock = new EphemeralSocket();

        server.once('message', onMessage);
        sock.send('hello');
        sock._queue._sendPacket();

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


test('can send multiple packets', function t(assert) {
    var server = UDPServer({ port: PORT }, function onBound() {
        var sock = new EphemeralSocket({
            host: 'localhost',
            port: PORT,
            packetQueue: { flush: 10, block: 5 }
        });
        var messages = [];

        server.on('message', onMessage);
        sock.send('hello');
        sock.send(' ');
        sock.send('world');

        function onMessage(msg) {
            messages.push(msg);

            if (messages.join('').length === 14) {
                onEnd();
            }
        }

        function onEnd() {
            assert.equal(messages.sort().join(''),
                ' \nhello\nworld\n');

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

test('can write to socket with DNS resolver', function t(assert) {
    var server = UDPServer({ port: PORT }, function onBound() {
        var sock = new EphemeralSocket({
            host: 'localhost',
            port: PORT,
            packetQueue: { flush: 10 }
        });
        sock.resolveDNS({});

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

test('DNS resolver will send IP address', function t(assert) {
    var sock = new EphemeralSocket({
        host: 'localhost',
        port: PORT,
        packetQueue: { flush: 10 },

        dgram: {
            createSocket: function () {
                var socket = {};
                socket.send = function (buf, s, e, port, host) {
                    var str = String(buf);
                    assert.equal(str, 'hello\n');

                    assert.ok(isIPv4(host));

                    sock.close();
                    assert.end();
                };
                socket.close = function () {};
                socket.unref = function () {};
                socket.once = function () {};

                return socket;
            }
        }
    });

    sock.resolveDNS({
        onresolved: function () {
            sock.send('hello');
        }
    });
});
