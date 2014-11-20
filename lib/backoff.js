var Back = require('back');
var extend = require('xtend/immutable');
var clearTimeout = require('timers').clearTimeout;

module.exports = Backoff;

function Backoff(backoffSettings) {
    if (!(this instanceof Backoff)) {
        return new Backoff(backoffSettings);
    }

    this.settings = extend(backoffSettings);
    this.back = null;
}

Backoff.prototype.backoff = function backoff(cb) {
    this.back = Back(cb, this.settings);
};

Backoff.prototype.close = function close() {
    if (this.back && this.back.timer) {
        return clearTimeout(this.back.timer);
    }
}
