/*
 * Use streamHook to measure the given streams bandwidth
 */
module.exports = function (parentClient) {
    return function (key, stream) {
        var startTime,
            size = 0;

        return parentClient.helpers.streamHook({
            data: function (data) {
                startTime = startTime || new Date();
                size += data.length;
            },
            end: function () {
                if (startTime) {
                    var time = (new Date() - startTime) || 1;
                    parentClient(key, size / time);
                }
            }
        }, stream);
    };
};
