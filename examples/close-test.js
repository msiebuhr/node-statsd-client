var timers_debug = require('timers-debug');
timers_debug.enable(true);
var sdc = require('../lib/statsd-client'),
    SDC = new sdc({
        host: '10.111.12.113',
        debug: true,
        prefix: "statsd-client"
    }),
    SDCTest = SDC.getChildClient('test');


var begin = new Date();
setTimeout(function() {
    // Set 'statsd-client.test.gauge'
    SDCTest.gauge('gauge', 100 * Math.random());

    // Icrement 'statsd-client.test.counter' twice
    SDCTest.increment('counter');
    SDC.increment('test.counter');

    // Set some time
    SDC.timing('speed', begin);

    // Close socket
    SDC.close();

    setTimeout(function() {
        timers_debug.debug();
    }, 6000);

}, 100 * Math.random());