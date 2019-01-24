/* Set up the statsd-client.
 *
 * Requires the `hostname`. Options currently allows for `port` and `debug` to
 * be set.
 */
interface Tags {[key:string]:string}

class StatsDClient {
    options: {[key:string]: any}
    _helpers: any;
    _socket: any;

    constructor(options?: any) {
        this.options = options || {};
        if (typeof this.options !== 'object') {
            throw new Error("Configuration data must be an object");
        }

        this.options.tags = this.options.tags || {};

        // Set defaults
        this.options.prefix = this.options.prefix || "";

        // Prefix?
        if (this.options.prefix && this.options.prefix !== "") {
            // Add trailing dot if it's missing
            var p = this.options.prefix;
            this.options.prefix = p[p.length - 1] === '.' ? p : p + ".";
        }

        // Figure out which socket to use
        if (this.options._socket) {
            // Re-use given socket
            this._socket = this.options._socket;
        } else if(this.options.tcp) {
            //User specifically wants a tcp socket
            this._socket = new (require('./TCPSocket'))(this.options);
        } else if (this.options.host && this.options.host.match(/^http(s?):\/\//i)) {
            // Starts with 'http://', then create a HTTP socket
            this._socket = new (require('./HttpSocket'))(this.options);
        } else {
            // Fall back to a UDP ephemeral socket
            this._socket = new (require('./EphemeralSocket'))(this.options);
        }
    }

    /*
     * Get a "child" client with a sub-prefix.
     */
    getChildClient(prefix: string): StatsDClient {
        return new StatsDClient({
            prefix: this.options.prefix + prefix,
            _socket: this._socket,
            tags: this.options.tags
        });
    }


    /*
     * gauge(name, value, tags)
     */
    gauge(name:string, value:number, tags?:Tags): StatsDClient {
        this._socket.send(this.options.prefix + name + ":" + value + "|g" + this.formatTags(tags));

        return this;
    };

    /*
     * gaugeDelta(name, delta, tags)
     */
    gaugeDelta(name:string, delta:number, tags?:Tags): StatsDClient {
        var sign = delta >= 0 ? "+" : "-";
        this._socket.send(this.options.prefix + name + ":" + sign + Math.abs(delta) + "|g" + this.formatTags(tags));

        return this;
    };

    /*
     * set(name, value, tags)
     */
    set(name: string, value: number | string, tags?: Tags): StatsDClient {
        this._socket.send(this.options.prefix + name + ":" + value + "|s" + this.formatTags(tags));

        return this;
    };

    /*
     * counter(name, delta, tags)
     */
    counter(name: string, delta: number, tags?: Tags): StatsDClient {
        this._socket.send(this.options.prefix + name + ":" + delta + "|c" + this.formatTags(tags));

        return this;
    };

    /*
     * increment(name, [delta=1], tags)
     */
    increment(name: string, delta?: number, tags?: Tags): StatsDClient {
        this.counter(name, Math.abs(delta === undefined ? 1 : delta), tags);

        return this;
    };

    /*
     * decrement(name, [delta=-1], tags)
     */
    decrement(name: string, delta?: number, tags?: Tags): StatsDClient {
        this.counter(name, -1 * Math.abs(delta === undefined ? 1 : delta), tags);

        return this;
    };

    /*
     * timing(name, date-object | ms, tags)
     */
    timing(name: string, time: Date | number, tags?: Tags): StatsDClient {
        // Date-object or integer?
        var t = time instanceof Date ? (Date.now() - time.getTime()) : time;

        this._socket.send(this.options.prefix + name + ":" + t + "|ms" + this.formatTags(tags));

        return this;
    };

    /*
     * histogram(name, value, tags)
     */
    histogram(name: string, value: number, tags?: Tags): StatsDClient {
        this._socket.send(this.options.prefix + name + ":" + value + "|h" + this.formatTags(tags));

        return this;
    };

    /*
     * formatTags(tags)
     */
    formatTags(metric_tags: Tags): string {
        var tags = {};

        // Merge global tags and metric tags.
        // Metric tags overwrite global tags for the same key.
        var key;
        for (key in this.options.tags) { tags[key] = this.options.tags[key]; }
        for (key in metric_tags) { tags[key] = metric_tags[key]; }

        if (!tags || Object.keys(tags).length === 0) {
            return '';
        }
        return '|#' + Object.keys(tags).map(function(key) {
            return key + ':' + tags[key];
        }).join(',');
    };

    /*
     * Send raw data to the underlying socket. Useful for dealing with custom
     * statsd-extensions in a pinch.
     */
    raw(rawData: string): StatsDClient {
        this._socket.send(rawData);

        return this;
    };

    /*
     * Close the socket, if in use and cancel the interval-check, if running.
     */
    close(): StatsDClient {
        this._socket.close();

        return this;
    };

    /*
     * Return an object with available helpers.
     */
    get helpers() {
        if (!(this._helpers)) {
            var helpers = {},
                that = this,
                files = require('fs').readdirSync(__dirname + '/helpers');

            files.forEach(function (filename) {
                if (/\.js$/.test(filename) && filename !== 'index.js') {
                    var name = filename.replace(/\.js$/, '');
                    helpers[name] = require('./helpers/' + filename)(that);
                }
            });
            this._helpers = helpers;
        }

        return this._helpers;
    }
}

export = StatsDClient;
