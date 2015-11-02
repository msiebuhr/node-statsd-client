var StatsDClient = require('../lib/statsd-client'),
    getExpressMiddlewareHelper = require('../lib/helpers/getExpressMiddleware'),
    assert = require('chai').assert;

/*global describe before it*/

describe('Helpers', function () {
    var c;

    before(function () {
        c = new StatsDClient();
    });

    it('.helpers is an object', function () {
        assert.isObject(c.helpers);
    });

    it('.getExpressMiddleware(prefix) → function (err, res, next)', function () {
        var f = c.helpers.getExpressMiddleware('prefix');
        assert.isFunction(f);
        assert.lengthOf(f, 3);
    });

    describe('.getExpressMiddleware()', function () {
        describe('.sanitize', function () {
            it('Removes colons', function () {
                assert.equal(
                    getExpressMiddlewareHelper._sanitizeUrl(':colon:'),
                    'colon'
                );
            });

            it('Removes leding+trailing slashes', function () {
                assert.equal(
                    getExpressMiddlewareHelper._sanitizeUrl('/foo/'),
                    'foo'
                );
            });

            it('Replaces slashes with underscores', function () {
                assert.equal(
                    getExpressMiddlewareHelper._sanitizeUrl('foo/bar/baz'),
                    'foo_bar_baz'
                );
            });
        });

        describe('.findRouteName', function () {
            it('Returns .locals.statsdUrlKey, if set', function () {
                assert.equal(
                    getExpressMiddlewareHelper._findRouteName(
                        {}, { locals: {statsdUrlKey: 'foobar'} }
                    ), 'foobar');
            });

            it('Returns `root` for URL /', function () {
                assert.equal(
                    getExpressMiddlewareHelper._findRouteName(
                        {
                            route: { path: '/' },
                            method: 'GET'
                        }, {}
                    ), 'GET_root');
            });

            it('Does what on no path???', function () {
                assert.equal(
                    getExpressMiddlewareHelper._findRouteName(
                        { method: 'GET' }, {}
                    ), undefined);
            });

            it('Returns regex souce on regex path', function () {
                assert.equal(
                    getExpressMiddlewareHelper._findRouteName(
                        {
                            method: 'GET',
                            route: { path: /foo(\w+)bar/ }
                        }, {}
                    ), 'GET_foo(\\w+)bar');
            });
        });
    });
});
