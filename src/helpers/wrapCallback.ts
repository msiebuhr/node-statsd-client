/*
 * Return a wrapped callback function shimmed to send metrics
 * once it is invoked. The returned function is to be used
 * exactly the same way as the original callback.
 */
import statsdClient = require('../statsd-client');

function factory(parentClient: statsdClient) {
    return function (prefix: string, callback: Function , options?: {tags?: {[key:string]: string}}) {
        options = options || {};

        var client = parentClient.getChildClient(prefix);
        var startTime = new Date();
        var tags = options.tags || {};

        return function (error) {
            if (error) {
                client.increment('err', 1, tags);
            } else {
                client.increment('ok', 1, tags);
            }
            client.timing('time', startTime, tags);
            return callback.apply(null , arguments);
        };
    };
}

export = factory;
