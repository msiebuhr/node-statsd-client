var StatsDClient = require('../lib/statsd-client'),
    FakeServer = require('./FakeServer'),
    EventEmitter = require('events').EventEmitter,
    assert = require('chai').assert,
    express = require('express'),
    supertest = require('supertest'),
    sinon = require('sinon');

/*global describe before it*/

describe('Helpers', function () {
    var c;
    var s;
    var es;
    var baseUrl;

    before(function (done) {
        s = new FakeServer();
        c = new StatsDClient({
            maxBufferSize: 0
        });

        var app = express();

        app.use(c.helpers.getExpressMiddleware('express', { timeByUrl: true }));

        // Routes defined on the express app itself.
        app.get('/', function (req, res) {
            res.sendStatus(200);
        });

        app.get('/foo', function (req, res) {
            res.sendStatus(200);
        });

        app.post('/foo', function (req, res) {
            res.sendStatus(200);
        });

        app.get('/foo/:param/bar', function (req, res) {
            res.sendStatus(200);
        });

        // Routes defined on the a subrouter or "micro-app".
        var router = express.Router();

        router.get('/foo', function (req, res) {
            res.sendStatus(200);
        });

        app.use('/subrouter', router);

        es = app.listen(3000, function () {
            baseUrl = 'http://localhost:' + 3000;
            s.start(done);
        });
    });

    after(function (done) {
      es.on('close', function () {
        s.stop();
        done();
      });
      es.close();
    });

    it('.helpers is an object', function () {
        assert.isObject(c.helpers);
    });

    it('.getExpressMiddleware(prefix) → function (err, res, next)', function () {
        var f = c.helpers.getExpressMiddleware('prefix');
        assert.isFunction(f);
        assert.lengthOf(f, 3);
    });

    describe('response times', function () {
      var sandbox;
      beforeEach(function () {
        sandbox = sinon.sandbox.create();
        sandbox.useFakeTimers(new Date().valueOf(), 'Date');
      });

      afterEach(function () {
        sandbox.restore();
      });

      describe('GET', function () {
        it('should count the response code', function (done) {
          supertest(baseUrl)
            .get('/')
            .expect(200)
            .end(function (err, res) {
              if (err) return done(err);
              s.expectMessage('express.response_code.200:1|c', done);
            });
        });

        it('should count the response code with the url prefix', function (done) {
          supertest(baseUrl)
            .get('/')
            .expect(200)
            .end(function (err, res) {
              if (err) return done(err);
              s.expectMessage('express.response_code.GET_root.200:1|c', done);
            });
        });

        it('/ → "GET_root"', function (done) {
          supertest(baseUrl)
            .get('/')
            .expect(200)
            .end(function (err, res) {
              if (err) return done(err);
              s.expectMessage('express.response_time.GET_root:0|ms', done);
            });
        });

        it('/foo → "GET_foo"', function (done) {
          supertest(baseUrl)
            .get('/foo')
            .expect(200)
            .end(function (err, res) {
              if (err) return done(err);
              s.expectMessage('express.response_time.GET_foo:0|ms', done);
            });
        });

        it('/foo/:param/bar → "GET_foo_param_bar"', function (done) {
          supertest(baseUrl)
            .get('/foo/mydynamicparameter/bar')
            .expect(200)
            .end(function (err, res) {
              if (err) return done(err);
              s.expectMessage('express.response_time.GET_foo_param_bar:0|ms', done);
            });
        });

        describe('sub-router', function () {
          it('/subrouter/foo → "GET_subrouter_foo"', function (done) {
            supertest(baseUrl)
              .get('/subrouter/foo')
              .expect(200)
              .end(function (err, res) {
                if (err) return done(err);
                s.expectMessage('express.response_time.GET_subrouter_foo:0|ms', done);
              });
          });
        });
      });

      describe('POST', function () {
        it('/foo → "POST_foo"', function (done) {
          supertest(baseUrl)
          .post('/foo')
          .expect(200)
          .end(function (err, res) {
            if (err) return done(err);
            s.expectMessage('express.response_time.POST_foo:0|ms', done);
          });
        });
      });
    });

    it('.wrapCallback(prefix, callback, options) → function', function () {
      var callback = function () {};
      var f = c.helpers.wrapCallback('prefix', callback);
      assert.isFunction(f);
    });

    describe('wrapped callback', function () {
      var sandbox;
      beforeEach(function () {
        sandbox = sinon.sandbox.create();
        sandbox.useFakeTimers(new Date().valueOf(), 'Date');
      });

      afterEach(function () {
        sandbox.restore();
      });

      it('invokes original callback', function (done) {
        var e = new Error('test'), v = 20;
        var callback = function (arg1, arg2) {
          assert.strictEqual(arg1, e);
          assert.strictEqual(arg2, v);
          return done();
        };
        var f = c.helpers.wrapCallback('prefix', callback);
        f(e, v);
      });

      describe('sends metrics', function () {
        var callback = function () {};
        var f;
        before(function () {
          f = c.helpers.wrapCallback('callback', callback, {
            tags: { foo: 'bar' }
          });
          f();
        });

        it('sends timing', function (done) {
          s.expectMessage('callback.time:0|ms|#foo:bar', done);
        });

        it('counts errors', function (done) {
          f(new Error('test'));
          s.expectMessage('callback.err:1|c|#foo:bar', done);
        });

        it('counts successes', function (done) {
          s.expectMessage('callback.ok:1|c|#foo:bar', done);
        });
      });
    });
});
