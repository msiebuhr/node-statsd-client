'use strict';

var RingBuffer = require('ringbufferjs');

module.exports = NullStatsd;

function NullStatsd(capacity) {
    if (!(this instanceof NullStatsd)) {
        return new NullStatsd(capacity);
    }

    this._buffer = new RingBuffer(capacity || 50);
}

function NullStatsdRecord(type, name, value, delta, time) {
    this.type = type;
    this.name = name;
    this.value = value || null;
    this.delta = delta || null;
    this.time = time || null;
}

var proto = NullStatsd.prototype;

proto._write = function _write(record) {
    this._buffer.enq(record);
};

proto.gauge = function gauge(name, value) {
    this._write(new NullStatsdRecord('g', name, value));
};

proto.counter = function counter(name, value) {
    this._write(new NullStatsdRecord('c', name, null, value));
};

proto.increment = function increment(name, delta) {
    this._write(new NullStatsdRecord(
        'c',
        name,
        null,
        delta || 1
    ));
};

proto.decrement = function decrement(name, delta) {
    this._write(new NullStatsdRecord(
        'c',
        name,
        null,
        (-1 * Math.abs(delta || 1))
    ));
};

proto.timing = function timing(name, time) {
    this._write(new NullStatsdRecord(
        'ms',
        name,
        null,
        null,
        time
    ));
};

proto.close = function close() {
    for (var i = 0, len = this._buffer.size(); i < len; i++) {
        this._buffer.deq();
    }
};
