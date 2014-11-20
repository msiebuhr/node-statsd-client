var setInterval = require('timers').setInterval;
var clearInterval = require('timers').clearInterval;
var Buffer = require('buffer').Buffer;

/*
The MIT License (MIT)

Copyright (c) 2014 Voxer IP LLC. All rights reserved.

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/
module.exports = PacketQueue;

/// Coalesce metrics packets.
///
/// send(buffer, offset, length)
/// options - (optional)
///   * block - Integer, maximum block size
///   * flush - Integer, millisecond flush interval
///
function PacketQueue(send, options) {
    if (!(this instanceof PacketQueue)) {
        return new PacketQueue(send, options);
    }

    options = options || {};
    this._send = send;
    this._blockSize = options.block || 1440;
    this._trailingNewLine = 'trailingNewLine' in options ?
        options.trailingNewLine : true;
    this._queue = null;
    this._writePos = null;
    this._reset();

    // Don't let stuff queue forever.
    var self = this;
    this._interval = setInterval(function() {
        //TODO  instrument _sendPacket() so we know how often
        //TODO      its called based on timeouts.
        if (self._queue.length) {
            self._sendPacket();
        }
    }, options.flush || 1000);
    this._interval.unref();
}

PacketQueue.prototype.destroy = function() {
    clearInterval(this._interval);
}

PacketQueue.prototype._reset = function() {
    this._queue = [];
    this._writePos = 0;
}

PacketQueue.prototype.write = function(str) {
    if (this._writePos + str.length >= this._blockSize &&
        this._writePos !== 0
    ) {
        //TODO  instrument _sendPacket() so we know how often
        //TODO      its called based on blockSize
        this._sendPacket();
    }

    this._queue.push(str);
    this._writePos += str.length + 1;
}

PacketQueue.prototype._sendPacket = function() {
    var str = this._queue.join('\n');
    if (this._trailingNewLine) {
        str += '\n';
    }

    var buf = new Buffer(str);
    this._send(buf, 0, buf.length);
    this._reset();
}
