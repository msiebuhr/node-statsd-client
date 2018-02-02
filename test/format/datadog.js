'use strict';

var assert = require('chai').assert;
var dd = require('../../lib/format/datadog');

describe('format - datadog', function () {
    var tests = [{
        in: ['foo.bar', 5, 'counter'],
        out: 'foo.bar:5|c'
    },{
        in: ['x', 1, 'counter', undefined, 0.1],
        out: 'x:1|c|@0.1'
    },{
        in: ['x', 1, 'counter', {foo: 'bar'}, 0.25],
        out: 'x:1|c|#foo:bar|@0.25'
    },{
        // Empty tags
        in: ['x', 1, 'counter', {}],
        out: 'x:1|c'
    },{
        // Gauge deltas
        in: ['x', '+1', 'gauge', {}],
        out: 'x:+1|g'
    },{
        // Gauge deltas
        in: ['x', '-1', 'gauge', {}],
        out: 'x:-1|g'
    }];

    tests.forEach(function (tt) {
        it('format(' + tt.in.join(', ') + ') returns ' + tt.out, function () {
            assert.strictEqual( dd.format.apply(null, tt.in), tt.out);
        });
    });

});
