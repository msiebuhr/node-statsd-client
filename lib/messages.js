module.exports = {
    Gauge: Gauge,
    Counter: Counter,
    Timing: Timing
};

function messageToString() {
    return this.name + ':' + this.value + '|' + this.type;
}

function Gauge(name, value) {
    this.type = 'g';
    this.name = name;
    this.value = value;
}

Gauge.prototype.toString = messageToString;

function Counter(name, value) {
    this.type = 'c';
    this.name = name;
    this.value = value;
}

Counter.prototype.toString = messageToString;

function Timing(name, value) {
    this.type = 'ms';
    this.name = name;
    this.value = value;
}

Timing.prototype.toString = messageToString;
