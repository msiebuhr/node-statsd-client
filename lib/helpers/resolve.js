/**
 * Ease the pressure of dns,
 * resolve ip address firstly.
 */

var dns = require('dns');

/**
 * Resolve ip address from hostname.
 * @public
 * @param  {string}   hostname Hostname
 * @param  {object}   options  dns.lookup options
 * @param  {Function} callback Callback function
 */
var resolve = function (hostname, options, callback) {
    dns.lookup(hostname, {
        family: 4,
        hints: dns.ADDRCONFIG | dns.V4MAPPED,
        all: false
    }, function (err, ip) {
        if (err) {
            return callback(err);
        }
        return callback(null, ip);
    });
};

module.exports = resolve;
