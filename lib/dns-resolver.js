var globalDns = require('dns');

var Backoff = require('./backoff.js');

/*
    type Options : {
        -- backoffSettings passed to `back` module.
        backoffSettings: {
            maxDelay?: Number,
            minDelay?: Number,
            retries?: Number,
            factor?: Number
        },

        onresolved: () => void | null
    }

    DNSResolver : (hostName: String, opts: Options) => {
        resolveHost: (key: String) => ip: String,
        lookupHost: (hostName: String) => void,
        close: () => void
    }

*/
module.exports = DNSResolver;

function DNSResolver(hostname, opts) {
    var backoffSettings = opts.backoffSettings || {};

    this._hostname = hostname;
    this._ipAddresses = null;

    this._dns = opts.dns || globalDns;
    this._backoffSettings = backoffSettings;
    this._destroyed = false;
    this._dnsBackoff = null;

    this.onresolved = opts.onresolved || null;
    this.onresolvegiveup = null;
}

var proto = DNSResolver.prototype;
proto.resolveHost = function resolveHost(message) {
    // If we dont have any ipAddresses yet just return
    // the hostname.
    if (this._ipAddresses === null) {
        return this._hostname;
    }

    return this._ipAddresses[0];
};

proto.lookupHost = function lookupHost() {
    var self = this;

    self._dns.resolve(self._hostname, onIPAddresses);

    function onIPAddresses(err, ipAddresses) {
        if (self._destroyed) {
            return;
        }

        // on error try again with a backoff.
        if (err) {
            // lazy instantiate the backoff
            self._dnsBackoff = self._dnsBackoff ||
                Backoff(self._backoffSettings);
            return self._dnsBackoff.backoff(retry);
        }

        self._dnsBackoff = null;
        self._ipAddresses = ipAddresses;

        // braindead simple events.
        // notifies user that we resolved the host.
        if (self.onresolved) {
            self.onresolved();
        }
    }

    function retry(backoffFailure) {
        // if backoff eventaully fails we just do not resolve
        // dns at all.
        if (backoffFailure) {
            self._dnsBackoff = null;

            // braindead simple events.
            // notifiers user that we gave up resolution.
            if (self.onresolvegiveup) {
                self.onresolvegiveup();
            }

            return;
        }

        self.lookupHost();
    }
};

proto.close = function close() {
    this._destroyed = true;
    if (this._dnsBackoff) {
        this._dnsBackoff.close();
    }
};
