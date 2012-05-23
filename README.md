node-statsd-client
==================

Node.js client for [statsd](https://github.com/etsy/statsd).

API
---

Quick init:

    var sdc = new require('statsd-client')('statsd.example.com');

The client can also be initialized with options, such as `debug` (off by
default), `port` (default 8125) and `socket_timeout` for when an unused socket
is closed (default 1000 ms), ex:

    var SDC = require('statsd-client'),
        sdc = new SDC('statsd.example.com', {port: 8124, debug: true});

### Counting stuff:

Counters are supported, both as raw `.counter(metric, delta)` and with the
shortcuts `.increment(metric, [delta=1])` and `.decrement(metric, [delta=-1])`:

    sdc.increment('systemname.subsystem.value'); // Increment by one
	sdc.decrement('systemname.subsystem.value', -10); // Decrement by 10
	sdc.counter('systemname.subsystem.value, 100); // Indrement by 100

### Gauges:

Sends an arbitrary number to the back-end:

	sdc.gauge('what.you.gauge', 100);

### Timing:

Keep track of how fast (or slow) your stuff is:

	var start = new Date();
	setTimeout(function () {
			sdc.timing('random.timeout', start);
	}, 100 * Math.random());

If it is given a `Date`, it will calculate the difference, and anything else
will be passed straight through.

What's broken
-------------

Check the [GitHub issues](https://github.com/msiebuhr/node-statsd-client/issues).

LICENSE
-------

ISC - see
[LICENSE.txt](https://github.com/msiebuhr/node-statsd-client/blob/master/LICENSE.txt).
