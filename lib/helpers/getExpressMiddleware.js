/*
 * Return express middleware that measures overall performance.
 */
function factory(parentClient) {
    return function (prefix, options) {
        var client = parentClient.getChildClient(prefix || '');
        options = options || {};
        var timeByUrl = options.timeByUrl || false;
        var onResponseEnd = options.onResponseEnd;

        return function (req, res, next) {
            var startTime = new Date();

            // Shadow end request
            var end = res.end;
            res.end = function () {
                end.apply(res, arguments);

                client.timing('response_time', startTime);
                client.increment('response.' + res.statusCode);

                if (timeByUrl && req.route && req.route.path) {
                    var routeName = req.route.path;
                    if (routeName === "/") routeName = "root";
                    // need to get rid of : in route names, remove first /, and replace rest with _
                    routeName = routeName.replace(/:/g, "").replace(/\//, "").replace(/\//g, "_");
                    client.timing('response_time.by_url.' + routeName, startTime);
                }

                if (onResponseEnd) {
                    onResponseEnd(client, startTime, req, res);
                }
            };
            next();
        };
    };
}

module.exports = factory;
