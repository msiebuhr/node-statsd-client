node-statsd-client
==================

Node.js client for [statsd](https://github.com/etsy/statsd).

Quick tour
----------

    var sdc = new require('statsd-client')({host: 'statsd.example.com'});

	var timer = new Date();
	sdc.increment('some.counter'); // Increment by one.
	sdc.gauge('some.gauge', 10); // Set gauge to 10
	sdc.timing('some.timer', timer); // Calculates time diff

	sdc.close(); // Optional - stop NOW

API
---

### Initialization

    var SDC = require('statsd-client'),
        sdc = new SDC({host: 'statsd.example.com', port: 8124, debug: true});

Available options:

 * `host`: Where to send the stats (default `localhost`).
 * `debug`: Print what is being sent to stderr (default `false`).
 * `port`: Port to contact the statsd-daemon on (default `8125`).
 * `prefix`: Prefix all stats with this value (default `""`).
 * `socket_timeout`: Auto-closes the socket after this long without activity
   (default 1000 ms; 0 disables this).

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

### Stopping

By default, the socket is closed if it hasn't been used for a second (the `socket_timeout` in the init-options), but it can also be force-closed with `.close()`:

	var start = new Date();
	setTimeout(function () {
		sdc.timing('random.timeout', start); // 2 - implicitly re-creates socket.
		sdc.close(); // 3 - Closes socket after last use.
	}, 100 * Math.random());
    sdc.close(); // 1 - Closes socket early.

The call is idempotent, so you can call it "just to be sure". And if you submit
new metrics later, the socket will automatically be re-created, and a new
timeout-timer started.

### Namespaces

The library supports getting "child" clients with extra prefixes, to help with
making sane name-spacing in apps:

    // Create generic client
    var sdc = new StatsDClient({host: 'statsd.example.com', prefix: 'systemname');
	sdc.increment('foo'); // Increments 'systemname.foo'
	... do great stuff ...

    // Subsystem A
	var sdcA = sdc.getChildClient('a');
	sdcA.increment('foo'); // Increments 'systemname.a.foo'

    // Subsystem B
	var sdcB = sdc.getChildClient('b');
	sdcB.increment('foo'); // Increments 'systemname.b.foo'

What's broken
-------------

Check the [GitHub issues](https://github.com/msiebuhr/node-statsd-client/issues).

LICENSE
-------

ISC - see
[LICENSE.txt](https://github.com/msiebuhr/node-statsd-client/blob/master/LICENSE.txt).
