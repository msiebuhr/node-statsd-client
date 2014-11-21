var globalDns = require('dns');
var setInterval = require('timers').setInterval;
var clearInterval = require('timers').clearInterval;

var Backoff = require('./backoff.js');

var SECOND = 1000;
var MINUTE = 60 * SECOND;
var DEFAULT_REFRESH_RATE = 5 * MINUTE;

/*
    type Options : {
        -- backoffSettings passed to `back` module.
        backoffSettings?: {
            maxDelay?: Number,
            minDelay?: Number,
            retries?: Number,
            factor?: Number
        },
        seedIP: ip: String,
        timeToLive?: Number,

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
    //TODO logger.warn() about no seedIP.
    this._ip = opts.seedIP || null;

    this._dns = opts.dns || globalDns;
    this._backoffSettings = backoffSettings;
    this._destroyed = false;
    this._dnsBackoff = null;
    this._timeToLive = opts.timeToLive || DEFAULT_REFRESH_RATE;
    this._refreshTimer = null;

    this.onresolved = opts.onresolved || null;
    this.onresolvegiveup = null;
}

var proto = DNSResolver.prototype;
proto.resolveHost = function resolveHost(message) {
    // If we dont have any ipAddresses yet just return
    // the hostname.
    //TODO logger.warn() about falling back to hostname
    if (this._ip === null) {
        return this._hostname;
    }

    return this._ip;
};

proto.lookupHost = function lookupHost() {
    var self = this;

    if (!this._refreshTimer) {
        this._refreshTimer = setInterval(retry,
            this._timeToLive);
        this._refreshTimer.unref();
    }

    self._dns.lookup(self._hostname, onIP);

    function onIP(err, ip) {
        //TODO logger.warn() about destroyed mid-flight.
        if (self._destroyed) {
            return;
        }

        // on error try again with a backoff.
        if (err) {
            // lazy instantiate the backoff
            //TODO  instrument _dnsBackoff so we know how
            //TODO      we actually backoff.
            self._dnsBackoff = self._dnsBackoff ||
                Backoff(self._backoffSettings);
            //TODO  logger.warn() that we failed DNS
            return self._dnsBackoff.backoff(retry);
        }

        self._dnsBackoff = null;
        self._ip = ip;

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
            //TODO logger.warn() that fetching DNS failed.
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

    if (this._refreshTimer) {
        clearInterval(this._refreshTimer);
    }
};
