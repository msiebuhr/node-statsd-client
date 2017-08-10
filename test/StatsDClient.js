var StatsDClient = require('../lib/statsd-client'),
    HttpSocket = require('../lib/HttpSocket'),
    EphemeralSocket = require('../lib/EphemeralSocket'),
    FakeServer = require('./FakeServer'),
    assert = require('chai').assert;

/*global describe before it after*/

describe('StatsDClient', function () {
    describe('Namespaces', function () {
        it('test → test.', function () {
            assert.equal(new StatsDClient({prefix: 'test'}).options.prefix, 'test.');
        });

        it('test. → test.', function () {
            assert.equal(new StatsDClient({prefix: 'test.'}).options.prefix, 'test.');
        });
    });

    var s, c;

    before(function (done) {
        s = new FakeServer();
        c = new StatsDClient({
            maxBufferSize: 0
        });
        s.start(done);
    });

    after(function () {
        s.stop();
    });

    describe("Counters", function () {
        it('.counter("abc", 1) → "abc:1|c', function (done) {
            c.counter('abc', 1);
            s.expectMessage('abc:1|c', done);
        });

        it('.counter("abc", -5) → "abc:-5|c', function (done) {
            c.counter('abc', -5);
            s.expectMessage('abc:-5|c', done);
        });

        it('.increment("abc") → "abc:1|c', function (done) {
            c.increment('abc');
            s.expectMessage('abc:1|c', done);
        });

        it('.increment("abc", 10) → "abc:10|c', function (done) {
            c.increment('abc', 10);
            s.expectMessage('abc:10|c', done);
        });

        it('.decrement("abc", -2) → "abc:-2|c', function (done) {
            c.decrement('abc', -2);
            s.expectMessage('abc:-2|c', done);
        });

        it('.decrement("abc", 3) → "abc:-3|c', function (done) {
            c.decrement('abc', -3);
            s.expectMessage('abc:-3|c', done);
        });

        it('.counter("abc", 0) → "abc:0|c', function (done) {
            c.counter('abc', 0);
            s.expectMessage('abc:0|c', done);
        });

        it('.decrement("abc", 0) → "abc:0|c', function (done) {
            c.decrement('abc', 0);
            s.expectMessage('abc:0|c', done);
        });
    });

    describe('Gauges', function () {
        it('.gauge("gauge", 3) → "gauge:3|g', function (done) {
            c.gauge('gauge', 3);
            s.expectMessage('gauge:3|g', done);
        });

        it('.gaugeDelta("gauge", 3) → "gauge:+3|g', function (done) {
            c.gaugeDelta('gauge', 3);
            s.expectMessage('gauge:+3|g', done);
        });

        it('.gaugeDelta("gauge", -3) → "gauge:-3|g', function (done) {
            c.gaugeDelta('gauge', -3);
            s.expectMessage('gauge:-3|g', done);
        });
    });

    describe('Sets', function () {
        it('.set("foo", 10) → "foo:10|s', function (done) {
            c.set('foo', 10);
            s.expectMessage('foo:10|s', done);
        });
    });

    describe('Histograms', function () {
        it('.histogram("foo", 10) → "foo:10|h', function (done) {
            c.histogram('foo', 10);
            s.expectMessage('foo:10|h', done);
        });
    });

    describe('Timers', function () {
        it('.timing("foo", 10) → "foo:10|ms', function (done) {
            c.timing('foo', 10);
            s.expectMessage('foo:10|ms', done);
        });

        it('.timing("foo", new Date(-20ms)) ~→ "foo:20|ms"', function (done) {
            this.slow(100);
            var d = new Date();
            setTimeout(function () {
                c.timing('foo', d);

                setTimeout(function () {
                    // Figure out if we git a right-looking message
                    var sentMessages = s._packetsReceived;
                    assert.lengthOf(sentMessages, 1);
                    assert.match(
                        sentMessages[0],
                        /foo:[12]\d\|ms/
                    );

                    // Expect it anyway, as we need to clean up the packet list.
                    s.expectMessage(sentMessages[0], done);
                }, 10);
            }, 20);
        });
    });

    describe('Tags', function () {
        it('.histogram("foo", 10) with global tags {"test":"tag","other":"tag"} → "foo:10|h|#test:tag,other:tag"', function (done) {
          new StatsDClient({
              maxBufferSize: 0,
              tags: {
                test: 'tag',
                other: 'tag'
              }
          }).histogram('foo', 10);
            s.expectMessage('foo:10|h|#test:tag,other:tag', done);
        });

        it('.histogram("foo", 10) with metric tags {"test":"tag","other":"tag"} → "foo:10|h|#test:tag,other:tag"', function (done) {
          c.histogram('foo', 10, { test: 'tag', other: 'tag'});
          s.expectMessage('foo:10|h|#test:tag,other:tag', done);
        });

        describe('metrics tags overwrite global tags', function () {
          it('.gauge("foo", 10, {tags}) with global tags → "foo:10|g|#global:tag,other:metric,metric:tag"', function (done) {
            new StatsDClient({
              maxBufferSize: 0,
              tags: {
                global: 'tag',
                other: 'tag'
              }
            }).gauge('foo', 10, {other: 'metric', metric: 'tag'});
            s.expectMessage('foo:10|g|#global:tag,other:metric,metric:tag', done);
          });
        });
    });

    describe('Raw', function () {
        it('.raw("foo.bar#123") → "foo.bar#123"', function (done) {
            c.raw('foo.bar#123');
            s.expectMessage('foo.bar#123', done);
        });
    });

    describe('Chaining', function() {
        it('.gauge() chains', function() {
            assert.equal(c, c.gauge('x', 'y'));
        });

        it('.gaugeDelta() chains', function() {
            assert.equal(c, c.gaugeDelta('x', 'y'));
        });

        it('.set() chains', function() {
            assert.equal(c, c.set('x', 'y'));
        });

        it('.counter() chains', function() {
            assert.equal(c, c.counter('x', 'y'));
        });

        it('.increment() chains', function() {
            assert.equal(c, c.increment('x', 'y'));
        });

        it('.decrement() chains', function() {
            assert.equal(c, c.decrement('x', 'y'));
        });

        it('.timing() chains', function() {
            assert.equal(c, c.timing('x', 'y'));
        });

        it('.histogram() chains', function() {
            assert.equal(c, c.histogram('x', 'y'));
        });

        it('.raw() chains', function () {
            assert.equal(c, c.raw('foo'));
        });

        it('.close() chains', function() {
            assert.equal(c, c.close('x', 'y'));
        });
    });
});

describe('StatsDClient / HTTP', function () {
    it('Giving plain host=example.com gives UDP backend', function () {
        assert.instanceOf(
            (new StatsDClient({ host: 'example.com' }))._socket,
            EphemeralSocket
        );
    });

    it('Giving host=https://example.com gives HTTP backend', function () {
        var c = new StatsDClient({
            host: 'https://example.com'
        });

        assert.instanceOf(c._socket, HttpSocket);
    });

    it('Giving host=http://example.com gives HTTP backend', function () {
        assert.instanceOf(
            (new StatsDClient({ host: 'http://example.com' }))._socket,
            HttpSocket
        );
    });
});
