var vows = require('vows'),
    assert = require('assert'),
    StatsDClient = require('../lib/statsd-client');

vows.describe('Helpers').addBatch({
    'StatsDClient()': {
        topic: function () {
            return new StatsDClient();
        },

        '.helpers': {
            topic: function (client) {
                return client.helpers;
            },

            'is object': function (helpers) {
                assert.isObject(helpers);
            },

            'getExpressMiddleware(prefix)': {
                topic: function (helpers, client) {
                    return helpers.getExpressMiddleware('prefix');
                },
                'is function': function (em) {
                    assert.isFunction(em);
                },
                'takes three arguments': function (em) {
                    assert.equal(em.length, 3);
                }
            },

            'streamHook({data: function(d){}})': {
                topic: function (helpers, client) {
                    return helpers.streamHook({data: function (d) {}});
                },
                'is event-emitter': function (sh) {
                    assert.instanceOf(sh, require('events').EventEmitter);
                }
            },

            'streamBandwidth(foobar)': {
                topic: function (helpers, client) {
                    return helpers.streamBandwidth("foobar");
                },
                'is event-emitter': function (sh) {
                    assert.instanceOf(sh, require('events').EventEmitter);
                }
            },

            'streamLatency(foobar)': {
                topic: function (helpers, client) {
                    return helpers.streamLatency("foobar");
                },
                'is event-emitter': function (sh) {
                    assert.instanceOf(sh, require('events').EventEmitter);
                }
            },

            'streamSize(foobar)': {
                topic: function (helpers, client) {
                    return helpers.streamSize("foobar");
                },
                'is event-emitter': function (sh) {
                    assert.instanceOf(sh, require('events').EventEmitter);
                }
            }
        }
    }
})['export'](module);
