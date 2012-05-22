node-statsd-client
==================

Node.js client for [statsd](https://github.com/etsy/statsd).

API
---

Initialization:

    var SDC = require('statsd-client'),
		sdc = new SDC('your-statsd-server);

The client can also be initialized with options, such as `debug` (off by
default) and `port` (default 8125).

Counting stuff:

    sdc.increment('systemname.subsystem.value'); // Increment by one
	sdc.decrement('systemname.subsystem.value', -10); // Decrement by 10 (default is -1)
	sdc.counter('systemname.subsystem.value, 100); // Whatever value

Gauges:

	sdc.gauge('what.you.gauge', 100);

Timing:

	var start = new Date();
	setTimeout(function () {
			sdc.timing('random.timeout', start);
	}, 100 * Math.random());

(You can also pass it any plain number...)

What's broken
-------------

Check the [GitHub issues](https://github.com/msiebuhr/node-statsd-client/issues).

Mainly:

 * No support for samping yet (the `|@0.1`-stuff).
 * Creates a socket for EACH measurement.
