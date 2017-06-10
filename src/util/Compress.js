"use strict";
var LZString = require('lz-string');
function compress(s) {
    return LZString.compressToBase64(s);
}
exports.compress = compress;
function decompress(s) {
    return LZString.decompressFromBase64(s);
}
exports.decompress = decompress;
function compressOpSet(set) {
    if (set === undefined)
        return undefined;
    if (set === null)
        return null;
    return compress(JSON.stringify(set));
}
exports.compressOpSet = compressOpSet;
function decompressOpSet(str) {
    if (str === undefined)
        return undefined;
    if (str === null)
        return null;
    return JSON.parse(decompress(str));
}
exports.decompressOpSet = decompressOpSet;
//# sourceMappingURL=Compress.js.map