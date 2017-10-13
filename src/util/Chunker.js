"use strict";
var Subject_1 = require('rxjs/Subject');
var HEADER_SEPARATOR = '|';
var FIELD_SEPARATOR = ',';
/**
 * For every incoming message emit one more more chunks
 */
var Chunker = (function () {
    function Chunker(chunkSize) {
        var _this = this;
        this.chunkSize = chunkSize;
        this.onMessage = function (msg) {
            var chunkSize = _this.chunkSize;
            var length = msg.length;
            var numChunks = Math.ceil(length / chunkSize);
            var msgId = Date.now().toString();
            for (var chunkNum = 0; chunkNum < numChunks; chunkNum++) {
                var start = chunkNum * chunkSize;
                var chunk = msg.substring(start, start + Math.min(chunkSize, length - start));
                _this.chunks.next("" + msgId + FIELD_SEPARATOR + chunkNum + FIELD_SEPARATOR + numChunks + HEADER_SEPARATOR + chunk);
            }
        };
        this.messages = new Subject_1.Subject();
        this.chunks = new Subject_1.Subject();
        this.messages.subscribe(this.onMessage);
    }
    return Chunker;
}());
exports.Chunker = Chunker;
/**
 * For every incoming chunk interpret the header and (if we have all the chunks) emit a message
 */
var Dechunker = (function () {
    function Dechunker() {
        var _this = this;
        this.onChunk = function (chunk) {
            var headerEndIdx = chunk.indexOf(HEADER_SEPARATOR);
            var header = chunk.substring(0, headerEndIdx);
            var _a = header.split(FIELD_SEPARATOR, 3), msgId = _a[0], chunkNumStr = _a[1], numChunksStr = _a[2];
            var chunkBody = chunk.substring(headerEndIdx + 1);
            if (!_this.buffer.has(msgId)) {
                _this.buffer.set(msgId, new MessageRecord(Number(numChunksStr)));
            }
            var record = _this.buffer.get(msgId);
            record.addChunk(Number(chunkNumStr), chunkBody);
            if (record.isComplete()) {
                _this.buffer.delete(msgId);
                _this.messages.next(record.getMessage());
            }
        };
        this.messages = new Subject_1.Subject();
        this.chunks = new Subject_1.Subject();
        this.buffer = new Map();
        this.chunks.subscribe(this.onChunk);
    }
    return Dechunker;
}());
exports.Dechunker = Dechunker;
var MessageRecord = (function () {
    function MessageRecord(numChunks) {
        this.numChunks = numChunks;
        this.received = new Map();
    }
    MessageRecord.prototype.addChunk = function (chunkNum, chunk) {
        this.received.set(chunkNum, chunk);
    };
    MessageRecord.prototype.isComplete = function () {
        return this.received.size === this.numChunks;
    };
    MessageRecord.prototype.getMessage = function () {
        if (this.numChunks === 1)
            return this.received.get(0);
        var ordered = [];
        for (var i = 0; i < this.numChunks; i++) {
            ordered.push(this.received.get(i));
        }
        return ordered.join('');
    };
    return MessageRecord;
}());
//# sourceMappingURL=Chunker.js.map