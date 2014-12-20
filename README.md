# uber-statsd-client

Node.js client for [statsd](https://github.com/etsy/statsd).

## Example

```js
var Statsd = require('uber-statsd-client');

var sdc = new Statsd({
    host: 'statsd.example.com'
});

var timer = new Date();
sdc.increment('some.counter'); // Increment by one.
sdc.gauge('some.gauge', 10); // Set gauge to 10
sdc.timing('some.timer', timer); // Calculates time diff

sdc.close(); // Optional - stop NOW
```

## Docs

```js
var SDC = require('uber-statsd-client')
var sdc = new SDC({
    host: 'statsd.example.com',
    port: 8124
});
```

Available options:

### `options.prefix`

type: `String`, default: `""`

Prefix all stats written by the client with a particular string
    prefix value. This defaults to `""`

### `options.host`

type: `String`, default: `""`

The hostname where stats should be send. Defaults to
    `"localhost"`

### `options.port`

type: `Number`, default: `8125`

The port where stats should be send. Defaults to `8125`

### `options.socket_timeout`

type: `Number`, default: `1000`

The UDP socket will auto-close if it has not been written to
    within the socket_timeout period. Defaults to `1000`
    milliseconds.

If `socket_timeout` is set to `0` then the UDP socket will never
    auto close.

### `options.highWaterMark`

type: `Number`, default: `100`

The UDP socket implementation has an internal `highWaterMark`.
    There is a known issue in node core where it will buffer
    packets being written to the UDP socket if it's currently
    in the "resolving DNS host" state.

When the `highWaterMark` is reached all packets are dropped
    and ignored.

### `options.packetQueue`

```ocaml
{
    block?: Number,
    flush?: Number,
    trailingNewLine?: Boolean
}
```

The UDP socket uses an internal packet queue that can be
    configured.

The semantics of the packet queue is that it will write to
    the UDP socket if it has buffered at least `block` amount
    of bytes OR it has elapsed at least `flush` amount of
    milliseconds.

By default the packet queue will join multiple messages with
    a new line. It will also append a trailing new line,
    however you can opt out of the trailing new line by setting
    `trailingNewLine` field to `false`.

The `block` field defaults to `1440` bytes.
The `flush` field defaults to `1000` milliseconds.
The `trailingNewLine` field defaults to `true`.

### `options.dnsResolver`

```ocaml
{
    timeToLive?: Number,
    seedIP?: String,
    backoffSettings?: {
        maxDelay?: Number,
        minDelay?: Number,
        retries?: Number,
        factor?: Number
    }
}
```

The UDP socket will optionally use a DNS resolver to resolve
    DNS once instead of resolving it for every UDP packet
    being written.

It's strongly recommended you use the DNS resolver.

The DNS resolver will resolve its DNS lookup based on the
    configured `timeToLive`. i.e. it caches the DNS host for
    at least that amount of time.

The DNS resolver takes a `seedIP` value, this is used when
    it cannot resolve DNS due to DNS failures and will fallback
    to the static IP you gave it.

The DNS resolver retries DNS lookups on DNS failures based on
    the `backoffSettings` you supply.

The `timeToLive` field defaults to five minutes (in milliseconds)
The `seedIP` field has no default.
The `backoffSettings.maxDelay` field defaults to `Infinity`
The `backoffSettings.minDelay` field defaults to `500` milliseconds
The `backoffSettings.retries` field defaults to `10` retries
The `backoffSettings.factor` field defaults to `2`.

### `options.isDisabled`

`isDisabled` is an optional predicate function. You can pass in
    a predicate function that allows you to disabled the statsd
    client at run time.

When this predicate function returns `true` the `EphemeralSocket`
    will stop writing to the statsd UDP server.

### Counting stuff

Counters are supported, both as raw `.counter(metric, delta)` and with the
shortcuts `.increment(metric, [delta=1])` and `.decrement(metric, [delta=-1])`:

    sdc.increment('systemname.subsystem.value'); // Increment by one
	sdc.decrement('systemname.subsystem.value', -10); // Decrement by 10
	sdc.counter('systemname.subsystem.value, 100); // Indrement by 100

### Gauges

Sends an arbitrary number to the back-end:

	sdc.gauge('what.you.gauge', 100);

### Delays

Keep track of how fast (or slow) your stuff is:

	var start = new Date();
	setTimeout(function () {
			sdc.timing('random.timeout', start);
	}, 100 * Math.random());

If it is given a `Date`, it will calculate the difference, and anything else
will be passed straight through.

And don't let the name (or nifty interface) fool you - it can measure any kind
of number, where you want to see the distribution (content lengths, list items,
query sizes, ...)

### Stopping gracefully

By default, the socket is closed if it hasn't been used for a second (see
`socket_timeout` in the init-options), but it can also be force-closed with
`.close()`:

	var start = new Date();
	setTimeout(function () {
		sdc.timing('random.timeout', start); // 2 - implicitly re-creates socket.
		sdc.close(); // 3 - Closes socket after last use.
	}, 100 * Math.random());
    sdc.close(); // 1 - Closes socket early.

The call is idempotent, so you can call it "just to be sure". And if you submit
new metrics later, the socket will automatically be re-created, and a new
timeout-timer started.

### Prefix-magic

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

Internally, they all use the same socket, so calling `.close()` on any of them
will allow the entire program to stop gracefully.

What's broken
-------------

Check the [GitHub issues](https://github.com/uber/node-statsd-client/issues).

LICENSE
-------

ISC - see
[LICENSE.txt](https://github.com/uber/node-statsd-client/blob/master/LICENSE.txt).
