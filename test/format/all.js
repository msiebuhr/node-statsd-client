'use strict';

var assert = require('chai').assert;

var formatters = ['datadog'];

describe('format', function () {
    formatters.forEach(function (name) {
        describe(name, function () {
            var f;

            before(function () {
                f = require('../../lib/format/' + name);
            });

            it('it has .types-dict', function () {
                assert.isObject(f.types);
            });

            it('it has .format-function', function () {
                assert.isFunction(f.format);
            });

            it('.format returns a string', function () {
                assert.isString(f.format('foo', 5, 'count'));
            });
        });
    });
});
