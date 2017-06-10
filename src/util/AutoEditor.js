"use strict";
var Subject_1 = require('rxjs/Subject');
var BehaviorSubject_1 = require('rxjs/BehaviorSubject');
var Protocol_1 = require('../signaler/Protocol');
var CodeMirror_1 = require('./CodeMirror');
var AutoEditor = (function () {
    function AutoEditor() {
        var _this = this;
        this.edits = new Subject_1.Subject();
        this.mode = new BehaviorSubject_1.BehaviorSubject(CodeMirror_1.DEFAULT_MODE);
        this.requestId = null;
        this.docs = null;
        this.baseTime = null;
        this.wiggleTime = null;
        this.curDocIdx = null;
        this.curPosition = null;
        this.onTick = function () {
            if (!_this.isRunning())
                return;
            var doc = _this.docs[_this.curDocIdx];
            if (_this.curPosition === 0)
                _this.mode.next(doc.mode);
            var chunk = doc.text.substring(_this.curPosition, _this.curPosition + 1);
            for (var i = _this.curPosition + chunk.length, next = doc.text.substring(i, i + 1); next !== '' && ' \t\n\r\v'.indexOf(next) > -1; i++, next = doc.text.substring(i, i + 1)) {
                chunk += next;
            }
            if (chunk.length > 0) {
                var edit = new Protocol_1.PadEdit();
                edit.isInsert = true;
                edit.index = _this.curPosition;
                edit.text = chunk;
                _this.curPosition += chunk.length;
                _this.edits.next(edit);
            }
            else {
                var edit = new Protocol_1.PadEdit();
                edit.isInsert = false;
                edit.index = 0;
                edit.text = doc.text;
                _this.curDocIdx = (_this.curDocIdx + 1) % _this.docs.length;
                _this.curPosition = 0;
                _this.edits.next(edit);
            }
            var timeout = _this.getNextTimeout();
            if (_this.isRunning())
                _this.requestId = window.setTimeout(_this.onTick, timeout);
        };
    }
    AutoEditor.prototype.start = function (docs, baseTime, wiggleTime) {
        if (baseTime === void 0) { baseTime = 100; }
        if (wiggleTime === void 0) { wiggleTime = 100; }
        if (this.isRunning())
            return;
        this.docs = docs;
        this.baseTime = baseTime;
        this.wiggleTime = wiggleTime;
        this.requestId = window.setTimeout(this.onTick, this.getNextTimeout());
        this.curDocIdx = Math.floor(Math.random() * this.docs.length);
        this.curPosition = 0;
    };
    AutoEditor.prototype.stop = function () {
        if (!this.isRunning())
            return;
        var rid = this.requestId;
        this.requestId = null;
        window.clearTimeout(rid);
    };
    AutoEditor.prototype.getEdits = function () { return this.edits; };
    AutoEditor.prototype.getMode = function () { return this.mode; };
    AutoEditor.prototype.isRunning = function () { return this.requestId !== null; };
    AutoEditor.prototype.getNextTimeout = function () {
        return this.baseTime + (Math.random() - 0.5) * this.wiggleTime;
    };
    return AutoEditor;
}());
exports.AutoEditor = AutoEditor;
//# sourceMappingURL=AutoEditor.js.map