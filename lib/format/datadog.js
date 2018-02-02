'use strict';

/* Format data as expected by datadog
 *
 * foo.bar|....
 */

var types = exports.types = {
    counter: 'c',
    gauge: 'g',
    histogram: 'h',
    set: 's',
    timing: 'ms',
};

var formatTags = exports._formatTags = function formatTags(kv) {
    if (!kv) { return ''; }
    var keys = Object.keys(kv).sort();

    if (keys.length === 0) { return ''; }

    var tags = [];

    for (var i = 0; i < keys.length; i += 1) {
        tags.push(keys[i] + ':' + kv[keys[i]]);
    }

    return '|#' + tags.join(',');
};

exports.format = function formatDatadog(name, value, type, tags, rate) {
    var out = name + ':' + value + '|' + (types[type] || type) + formatTags(tags);
    
    if (rate && rate != 1) { out += "|@" + rate; }

    return out;
};
