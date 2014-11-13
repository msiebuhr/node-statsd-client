var test = require('tape');
var isIPv4 = require('net').isIPv4;
var process = require('process');

var DNSResolver = require('../lib/dns-resolver.js');

var REAL_HOST = 'google.com';
var FAKE_HOST = 'not.a.real.domain.example.com';

test('DNS resolver defaults to host', function t(assert) {
    var resolver = new DNSResolver('google.com', {});
    resolver.lookupHost();

    var hostname = resolver.resolveHost('some-key');
    assert.equal(hostname, REAL_HOST);

    resolver.close();
    assert.end();
});

test('can resolve DNS', function t(assert) {
    var resolver = new DNSResolver(REAL_HOST, {});
    resolver.onresolved = onresolved;
    resolver.lookupHost();

    function onresolved() {
        var hostname = resolver.resolveHost('some-key');
        assert.ok(isIPv4(hostname));

        resolver.close();
        assert.end();
    }
});

test('retries on DNS failures', function t(assert) {
    var resolver = new DNSResolver(REAL_HOST, {
        dns: {
            counter: 0,
            resolve: function (hostname, cb) {
                var self = this;
                process.nextTick(function () {
                    if (self.counter === 0) {
                        cb(new Error('DNS failure'));
                    } else {
                        cb(null, ['0.0.0.0']);
                    }

                    self.counter++;
                });
            }
        },
        backoffSettings: {
            minDelay: 0,
            maxDelay: 50
        }
    });

    resolver.onresolved = onresolved;
    resolver.lookupHost();

    function onresolved() {
        var hostname = resolver.resolveHost('some-key');
        assert.ok(isIPv4(hostname));

        resolver.close();
        assert.end();
    }
});

test('can close a DNS resolver', function t(assert) {
    var resolver = new DNSResolver(FAKE_HOST, {
        backoffSettings: {
            retries: Infinity
        }
    });

    resolver.lookupHost();

    resolver.close();
    assert.end();
});

test('can close a DNS resolver after DNS', function t(assert) {
    var resolver = new DNSResolver(FAKE_HOST, {
        backoffSettings: {
            retries: Infinity
        },
        dns: {
            resolve: function (host, cb) {
                process.nextTick(function () {
                    cb(new Error('no'));

                    process.nextTick(close);
                });
            }
        }
    });

    resolver.lookupHost();

    function close() {
        var hostname = resolver.resolveHost('some-key');
        assert.equal(hostname, FAKE_HOST);
        
        resolver.close();
        assert.end();
    }
});

test('DNS resolver will give up', function t(assert) {
    var resolver = new DNSResolver(FAKE_HOST, {
        backoffSettings: {
            retries: 3,
            minDelay: 0,
            maxDelay: 50
        }
    });

    resolver.onresolvegiveup = onresolvegiveup;
    resolver.lookupHost();

    function onresolvegiveup() {
        var hostname = resolver.resolveHost('some-key');
        assert.equal(hostname, FAKE_HOST);

        resolver.close();
        assert.end();
    }
})
