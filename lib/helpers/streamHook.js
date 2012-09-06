/*
 * Hook into a stream.
 *
 * See measureStream* for examples.
 */
var ProxyStream = require('../ProxyStream');

function factory(parentClient) {
    return function (listeners, stream) {
        stream = stream || new ProxyStream();

        // Mount entries from listeners object on the given stream.
        ['data', 'end', 'error', 'close'].forEach(function (listener) {
            if (listener in listeners) {
                stream.on(listener, listeners[listener]);
            }
        });

        return stream;
    };
}

module.exports = factory;
