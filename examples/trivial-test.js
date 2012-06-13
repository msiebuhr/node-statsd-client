var sdc = require('../lib/statsd-client'),
    SDC = new sdc({host: '10.111.12.113', debug: 1, prefix: "statsd-client"});

var begin = new Date();
setTimeout(function () {
    SDC.gauge('test.gauge', 100 * Math.random());
    SDC.increment('test.counter');
    SDC.timing('speed', begin);
    SDC.close();
}, 100 * Math.random());

