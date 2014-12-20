var test = require('tape');
var setTimeout = require('timers').setTimeout;

var UDPServer = require('./lib/udp-server.js');
var StatsDClient = require('../lib/statsd-client.js');

var PORT = 8125;

test('can write gauge to client', function t(assert) {
    var server = UDPServer({ port: PORT }, function onBound() {
        var client = new StatsDClient({
            host: 'localhost',
            port: PORT,
            packetQueue: { flush: 10 }
        });

        client.gauge('foo', 'bar');
        server.once('message', function (msg) {
            assert.equal(msg.toString(), 'foo:bar|g');

            server.close();
            client.close();
            assert.end();
        });
    });
});

test('respects isDisabled', function t(assert) {
    var isDisabledBool = false;
    var server = UDPServer({ port: PORT }, function onBound() {
        var client = new StatsDClient({
            host: 'localhost',
            port: PORT,
            packetQueue: { flush: 10 },
            isDisabled: function isDisabled() {
                return isDisabledBool;
            }
        });

        server.once('message', onMessage);
        client.counter('foo', 1);

        function onMessage(msg) {
            assert.equal(msg.toString(), 'foo:1|c\n');

            isDisabledBool = true;
            server.on('message', failure);
            client.counter('foo', 1);

            setTimeout(next, 100);

            function failure() {
                assert.ok(false, 'unexpected message');
            }

            function next() {
                isDisabledBool = false;
                server.removeListener('message', failure);

                server.once('message', onMessage2);
                client.counter('foo', 1);
            }

            function onMessage2(msg) {
                assert.ok(String(msg));

                end();
            }
        }

        function end() {
            client.close();
            server.close();
            assert.end();
        }
    });
})

test('can write timing to client', function t(assert) {
    var server = UDPServer({ port: PORT }, function onBound() {
        var client = new StatsDClient({
            host: 'localhost',
            port: PORT,
            packetQueue: { flush: 10 }
        });

        client.counter('foo', 1);
        server.once('message', function (msg) {
            assert.equal(msg.toString(), 'foo:1|c\n');

            server.close();
            client.close();
            assert.end();
        });
    });
});

test('can write with prefix', function t(assert) {
    var server = UDPServer({ port: PORT }, function onBound() {
        var client = new StatsDClient({
            prefix: 'bar',
            packetQueue: { flush: 10 }
        });

        client.timing('foo', 42);
        server.once('message', function (msg) {
            assert.equal(msg.toString(), 'bar.foo:42|ms\n');

            server.close();
            client.close();
            assert.end();
        });
    });
})

test('can write with prefix trailing dot', function t(assert) {
    var server = UDPServer({ port: PORT }, function onBound() {
        var client = new StatsDClient({
            prefix: 'bar.',
            packetQueue: { flush: 10 }
        });

        client.timing('foo', 42);
        server.once('message', function (msg) {
            assert.equal(msg.toString(), 'bar.foo:42|ms\n');

            server.close();
            client.close();
            assert.end();
        });
    });
});

test('can write with child prefix', function t(assert) {
    var server = UDPServer({ port: PORT }, function onBound() {
        var client = new StatsDClient({
            prefix: 'bar.',
            packetQueue: { flush: 10 }
        });

        client = client.getChildClient('baz');

        client.timing('foo', 42);
        server.once('message', function (msg) {
            assert.equal(msg.toString(), 'bar.baz.foo:42|ms\n');

            server.close();
            client.close();
            assert.end();
        });
    });
});


test('can write counter to client', function t(assert) {
    var server = UDPServer({ port: PORT }, function onBound() {
        var client = new StatsDClient();

        client.timing('foo', 42);
        client._ephemeralSocket._queue._sendPacket();
        server.once('message', function (msg) {
            assert.equal(msg.toString(), 'foo:42|ms\n');

            server.close();
            client.close();
            assert.end();
        });
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

test('client.increment()', function t(assert) {
    var server = UDPServer({ port: PORT }, function onBound() {
        var sock = new StatsDClient({
            host: 'localhost',
            port: PORT,
            packetQueue: { flush: 10 }
        });

        server.once('message', onMessage);
        sock.increment('hello');

        function onMessage(msg) {
            var str = String(msg);
            assert.equal(str, 'hello:1|c\n');

            sock.close();
            server.close();
            assert.end();
        }
    });
});

test('client.decrement()', function t(assert) {
    var server = UDPServer({ port: PORT }, function onBound() {
        var sock = new StatsDClient({
            host: 'localhost',
            port: PORT,
            packetQueue: { flush: 10 }
        });

        server.once('message', onMessage);
        sock.decrement('hello');

        function onMessage(msg) {
            var str = String(msg);
            assert.equal(str, 'hello:-1|c\n');

            sock.close();
            server.close();
            assert.end();
        }
    });
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

test('can write with DNS resolver', function t(assert) {
    var server = UDPServer({ port: PORT }, function onBound() {
        var client = new StatsDClient({
            dnsResolver: {},
            packetQueue: { flush: 10 }
        });

        client.timing('foo', 42);
        server.once('message', function (msg) {
            assert.equal(msg.toString(), 'foo:42|ms\n');

            server.close();
            client.close();
            assert.end();
        });
    });
})

test('client.timing() with Date', function t(assert) {
    var server = UDPServer({ port: PORT }, function onBound() {
        var client = new StatsDClient({
            prefix: 'bar',
            packetQueue: { flush: 10 }
        });

        client.timing('foo', new Date());
        server.once('message', function (msg) {
            assert.equal(msg.toString(), 'bar.foo:0|ms\n');

            server.close();
            client.close();
            assert.end();
        });
    });
})
