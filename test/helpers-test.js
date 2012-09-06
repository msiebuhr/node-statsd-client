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
            }
        }
    }
})['export'](module);
