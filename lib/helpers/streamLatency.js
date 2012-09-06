/*
 * Measure how long a stream is running.
 */

module.exports = function (parentClient) {
    return function (key, stream) {
        var startTime;

        return parentClient.helpers.streamHook({
            data: function (data) {
                startTime = startTime || new Date();
            },
            end: function () {
                if (startTime) {
                    var time = (new Date() - startTime) || 1;
                    parentClient.timing(key, time);
                }
            }
        }, stream);
    };
};
