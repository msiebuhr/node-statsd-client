var StatsDClient = require('../lib/statsd-client'),
    FakeEphemeralSocket = require('./fakeEphemeralSocket'),
    assert = require('chai').assert;

/*global describe before it*/

describe('StatsDClient', function () {
    describe('Namespaces', function () {
        it('test → test.', function () {
            assert.equal(new StatsDClient({prefix: 'test'}).options.prefix, 'test.');
        });

        it('test. → test.', function () {
            assert.equal(new StatsDClient({prefix: 'test.'}).options.prefix, 'test.');
        });
    });

    describe('W. FakeEphemeralSocket', function () {
        var c;

        function assertGotMessage(m) {
            assert(
                c._ephemeralSocket.testAndDeleteMessage(m),
                "Couldn't find message '" + m + "' among [" + c._ephemeralSocket.sent_messages.join(", ") + "]."
            );
        }

        before(function () {
            c = new StatsDClient({
                _ephemeralSocket: new FakeEphemeralSocket()
            });
        });

        describe("Counters", function () {
            it('.counter("abc", 1) → "abc:1|c', function () {
                c.counter('abc', 1);
                assertGotMessage('abc:1|c');
            });

            it('.counter("abc", -5) → "abc:-5|c', function () {
                c.counter('abc', -5);
                assertGotMessage('abc:-5|c');
            });

            it('.increment("abc") → "abc:1|c', function () {
                c.increment('abc');
                assertGotMessage('abc:1|c');
            });

            it('.increment("abc", 10) → "abc:10|c', function () {
                c.increment('abc', 10);
                assertGotMessage('abc:10|c');
            });

            it('.decrement("abc", -2) → "abc:-2|c', function () {
                c.decrement('abc', -2);
                assertGotMessage('abc:-2|c');
            });

            it('.decrement("abc", 3) → "abc:-3|c', function () {
                c.decrement('abc', -3);
                assertGotMessage('abc:-3|c');
            });
        });

        describe('Gauges', function () {
            it('.gauge("gauge", 3) → "gauge:-3|g', function () {
                c.gauge('gauge', 3);
                assertGotMessage('gauge:3|g');
            });
        });

        describe('Sets', function () {
            it('.set("foo", 10) → "foo:10|s', function () {
                c.set('foo', 10);
                assertGotMessage('foo:10|s');
            });
        });

        describe('Timers', function () {
            it('.timing("foo", 10) → "foo:10|ms', function () {
                c.timing('foo', 10);
                assertGotMessage('foo:10|ms');
            });

            it('.timing("foo", new Date(-20ms)) ~→ "foo:20|ms"', function (done) {
                var d = new Date();
                setTimeout(function () {
                    c.timing('foo', d);

                    // Figure out if we git a right-looking message
                    var sentMessages = c._ephemeralSocket.sent_messages;
                    assert.lengthOf(sentMessages, 1);
                    assert.match(
                        sentMessages[0],
                        /foo:2\d\|ms/
                    );
                    done();
                }, 20);
            });



        });
    });
});
