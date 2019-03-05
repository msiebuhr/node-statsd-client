
// Removes ":", heading/trailing / and replaces / by _ in a given route name
function sanitize(routeName) {
    return routeName.replace(/:/g, "").replace(/^\/|\/$/g, "").replace(/\//g, "_");
}

// Extracts a route name from the request or response
function findRouteName(req, res) {
    // Did we get a hardcoded name, or should we figure one out?
    if (res.locals && res.locals.statsdUrlKey) {

        return res.locals.statsdUrlKey;
    }

    if (req.route && req.route.path) {
        var routeName = req.route.path;

        if (Object.prototype.toString.call(routeName) === '[object RegExp]') {
            routeName = routeName.source;
        }

        if (req.baseUrl) {
            routeName = req.baseUrl + routeName;
        } else if (routeName === '/') {
            routeName = 'root';
        }

        if (req.params) {
            Object.keys(req.params).forEach(function(key) {
                if (req.params[key] === '') return;
                routeName = routeName.replace(req.params[key], ':' + key);
            });
        }

        // Appends the HTTP method
        return req.method + '_' + sanitize(routeName);
    }
}

/*
 * Return express middleware that measures overall performance.
 *
 * The `prefix` defaults to `''` (but is currently mandatory). The
 * `options`-argument is optional.
 *  * You can set `timeByUrl`, that add a timer per URL template (ex:
 *    `/api/:username/:thingie`). This can be changed run-time by setting
 *    `res.locals.statsdUrlKey`.
 *  * Add a `function(client, startTime, req, res)` in `onResponseEnd` that
 *    will be called at the very end.
 */
function factory(parentClient) {
    return function (prefix, options) {
        options = options || {};

        var client = parentClient.getChildClient(prefix || '');
        var timeByUrl = options.timeByUrl || false;
        var notFoundRouteName = options.notFoundRouteName || 'unknown_express_route';
        var onResponseEnd = options.onResponseEnd || undefined;

        return function (req, res, next) {
            var startTime = new Date();

            // Shadow end request
            var end = res.end;
            res.end = function () {
                res.end = end;
                end.apply(res, arguments);

                var urlPrefix = '';

                // Time by URL?
                if (timeByUrl) {
                    urlPrefix += '.';
                    urlPrefix += findRouteName(req, res) || notFoundRouteName;
                    client.increment('response_code' + urlPrefix + '.' + res.statusCode);
                }

                client.increment('response_code.' + res.statusCode);
                client.timing('response_time' + urlPrefix, startTime);

                if (onResponseEnd) {
                    onResponseEnd(client, startTime, req, res);
                }
            };
            next();
        };
    };
}

module.exports = factory;
