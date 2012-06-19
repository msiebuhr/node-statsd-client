var Stream = require('stream').Stream,
    events = require('events'),
    util = require('util');

/*
 * Stream that allows hooks to be inserted all relevant places.
 *
 * Inspired by https://gist.github.com/1454516
 */

function ProxyStream(hooks) {
    this.readable = true;
    this.writable = true;
}
util.inherits(ProxyStream, Stream);

/*
 * Implement a stream -- .pipe() and friends follow from Stream.
 */
ProxyStream.prototype.write = function (data) {
    this.emit('data', data);
};

ProxyStream.prototype.end = function () {
    this.emit('end');
};

ProxyStream.prototype.error = function (error) {
    this.emit('error', error);
};

ProxyStream.prototype.close = function () {
    this.emit('close');
};

ProxyStream.prototype.destroy = function () {
    this.emit('destory');
};

module.exports = ProxyStream;
