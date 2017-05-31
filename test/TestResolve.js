var dns = require('dns'),
    assert = require('chai').assert,
    resolve = require('../lib/helpers/resolve');

describe('Test resolve', function () {
    it('should be ok', function (done) {
        dns.lookup('localhost', {
            family: 4,
            hints: dns.ADDRCONFIG | dns.V4MAPPED,
            all: false
        }, function (err, ip) {
            assert.equal(ip, '127.0.0.1');
            done();
        });
    });
});