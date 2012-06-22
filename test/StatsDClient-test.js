var vows = require('vows'),
    assert = require('assert'),
    FakeEphemeralSocket = require('./fakeEphemeralSocket'),
    StatsDClient = require('../lib/statsd-client');

function assertGotMessage(message) {
    return function (client) {
        assert(client._ephemeralSocket.testAndDeleteMessage(message));
    }
}

vows.describe('StatsDClient Basics').addBatch({
    'StatsDClient()': {
        topic: function () {
            return new StatsDClient({
                _ephemeralSocket: new FakeEphemeralSocket()
            });
        },
        'add trailing dot at the end of the prefix': {
            'test': function () {
                assert.equal(new StatsDClient({prefix: 'test'}).options.prefix, 'test.');
            },
            'test.': function () {
                assert.equal(new StatsDClient({prefix: 'test.'}).options.prefix, 'test.');
            }
        },
        '.increment(foo)': {
            topic: function (client) {
                client.increment('foo');
                return client;
            },
            'foo:1|c': assertGotMessage('foo:1|c'),
        },
        '.increment(foo, 10)': {
            topic: function (c) {
                c.increment('foo', 10);
                return c;
            },
            'foo:10|c': assertGotMessage('foo:10|c')
        },
        '.decrement(foo, -10)': {
            topic: function (c) {
                c.decrement('foo', -10);
                return c;
            },
            'foo:-10|c': assertGotMessage('foo:-10|c')
        },
        '.decrement(foo, 11)': {
            topic: function (c) {
                c.decrement('foo', 11);
                return c;
            },
            'foo:-11|c': assertGotMessage('foo:-11|c')
        },
        '.gauge(foo, 10)': {
            topic: function (c) {
                c.gauge('foo', 10);
                return c;
            },
            'foo:10|g': assertGotMessage('foo:10|g')
        }
    }
})['export'](module);
