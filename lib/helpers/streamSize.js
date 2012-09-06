/*
 * Measure how much data flows through a stream.
 */

module.exports = function (parentClient) {
    return function (key, stream) {
        var startTime;

        return parentClient.helpers.streamHook({
            data: function (data) {
                parentClient.increment(key, data.length);
            }
        }, stream);
    };
};
