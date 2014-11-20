/*
The MIT License (MIT)

Copyright (c) 2014 Voxer IP LLC. All rights reserved.

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the 'Software'), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

var test = require('tape');
var process = require('process');
var setTimeout = require('timers').setTimeout;

var PacketQueue = require('../lib/packet-queue')

function noop() {}

test('PacketQueue', function(assert) {
    var pq = new PacketQueue(noop, {block: 10})
    assert.equals(pq._send, noop)
    assert.equals(pq._blockSize, 10)
    assert.deepEquals(pq._queue, [])
    assert.end();
    pq.destroy()
})

test('PacketQueue#reset', function(assert) {
    var pq = new PacketQueue(noop)
    pq.write('foo')
    pq._reset()

    assert.deepEquals(pq._queue, [])
    assert.end();
    pq.destroy()
})

test('PacketQueue#write queue', function(assert) {
    var pq  = new PacketQueue(function() {
        assert.fail()
    }, {
        block: 30
    })
    var pos = pq._writePos

    pq.write('12345')
    assert.deepEquals(pq._queue, ['12345'])
    assert.equals(pq._writePos, pos + 6)
    assert.end();
    pq.destroy()
});

test('PacketQueue#write flush', function(assert) {
    var blockSize = 30
    var w  = 0
    var pq = new PacketQueue(send, {
        block: blockSize, flush: 10
    })

    pq.write('123')
    pq.write('456')
    
    setTimeout(function() {
        assert.equals(w, 1)
        assert.end();
        pq.destroy()
    }, 15)

    function send(data, offset, len) {
        w++
        assert.deepEquals(data.toString(), '123\n456\n')
        assert.equals(offset, 0)
        assert.equals(len, data.length)
    }
})

test('PacketQueue#write overflow', function(assert) {
    var pq = new PacketQueue(send, {
        block: 9
    })
    pq.write('123')
    pq.write('456')
    pq.write('789')

    function send(data, offset, len) {
        assert.deepEquals(data.toString(), '123\n456\n')
        assert.equals(offset, 0)
        assert.equals(len, '123456\n'.length + 1)

        process.nextTick(function() {
            assert.deepEquals(pq._queue, ['789'])
            assert.end();
            pq.destroy()
        })
    }
})

test('PacketQueue late write', function (assert) {
    var called = 0;
    var pq = new PacketQueue(send, {
        block: 30, flush: 10
    });

    setTimeout(function () {
        assert.equal(called, 0);
        pq.write('hello');

        setTimeout(function () {
            assert.equal(called, 1);
            assert.end();
            pq.destroy();
        }, 15);
    }, 25);

    function send(data, offset, len) {
        called++;
        assert.equal(data.toString(), 'hello\n');
    }
});

test('PacketQueue write large buffer', function (assert) {
    var called = 0;
    var pq = new PacketQueue(send, {
        flush: 10, block: 10
    });

    pq.write('hellohellohello');

    setTimeout(function () {
        assert.equal(called, 1);

        assert.end();
        pq.destroy();
    }, 15);

    function send(buf) {
        assert.equal(String(buf), 'hellohellohello\n');
        called++;
    }
})

test('PacketQueue without trailing new line', function (assert) {
    var called = {
        one: 0,
        two: 0
    };
    var pq = new PacketQueue(send, {
        flush: 10
    });
    var pq2 = new PacketQueue(send2, {
        flush: 10,
        trailingNewLine: false
    })

    pq.write('hello');
    pq2.write('hello');

    setTimeout(function () {
        assert.equal(called.one, 1);
        assert.equal(called.two, 1);

        assert.end();
        pq.destroy();
        pq2.destroy();
    }, 15);

    function send(data, offset, len) {
        assert.equal(String(data), 'hello\n');
        called.one++
    }

    function send2(data, offset, len) {
        assert.equal(String(data), 'hello');
        called.two++
    }
});
