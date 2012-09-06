/*
 * Return express middleware that measures overall performance.
 */
function factory(parentClient) {
    return function (prefix, options) {
        var client = parentClient.getChildClient(prefix);
        options = options || {};

        return function (req, res, next) {
            var startTime = new Date();

            // Shadow end request
            var end = res.end;
            res.end = function (chunk, encoding) {
                end.apply(res, arguments);

                client.timing('response_time', startTime);
                client.increment('response.' + res.statusCode);
            };
            next();
        };
    };
}

module.exports = factory;
