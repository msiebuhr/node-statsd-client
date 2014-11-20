var dgram = require('dgram');

module.exports = UDPServer;

function UDPServer(opts, onBound) {
    if (!opts || !opts.port) {
        throw new Error('UDPServer: `opts.port` required');
    }
    if (typeof onBound !== 'function') {
        throw new Error('UDPServer: `onBound` function is required');
    }

    var port = opts.port;

    var server = dgram.createSocket('udp4');
    server.bind(port, onBound);

    return server;
}
