"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var core_1 = require('@angular/core');
var CodeMirror_1 = require('../util/CodeMirror');
var AutoEditor_1 = require('../util/AutoEditor');
var ExampleCode_1 = require('../util/ExampleCode');
var Palette_1 = require('../util/Palette');
var PadModel_1 = require('../services/PadModel');
var Protocol_1 = require('../signaler/Protocol');
/**
 * The editor component + interface between our PadModel and the Codemirror editor.
 * Much of this is based off the awesome example here:
 * https://github.com/Operational-Transformation/ot.js/blob/master/lib/codemirror-adapter.js
 */
var EditorComponent = (function () {
    function EditorComponent(elementRef) {
        var _this = this;
        this.elementRef = elementRef;
        this.applyingRemoteChanges = false;
        this.isDemoMode = false;
        this.localUserId = null;
        this.remoteMarkers = new Map();
        this.setMode = function (mode) {
            _this.editor.setOption('mode', mode.mime);
        };
        this.onRemoteEdits = function (edits) {
            if (_this.isDemoMode && _this.pad && _this.pad.isStarted())
                _this.setDemoMode(false);
            _this.applyingRemoteChanges = true;
            var doc = _this.editor.getDoc();
            _this.editor.operation(function () {
                edits.forEach(function (edit) {
                    var start = doc.posFromIndex(edit.index);
                    var end = doc.posFromIndex(edit.index + edit.text.length);
                    if (edit.isInsert) {
                        doc.replaceRange(edit.text, start, null);
                    }
                    else {
                        doc.replaceRange('', start, end);
                    }
                });
            });
            _this.applyingRemoteChanges = false;
        };
        this.onLocalEdits = function (instance, changes) {
            if (_this.applyingRemoteChanges || _this.isDemoMode || !_this.localEdits) {
                return;
            }
            var doc = instance.getDoc();
            changes.forEach(function (change) {
                var idx = doc.indexFromPos(change.from);
                var inserted = change.text.join('\n');
                var removed = change.removed.join('\n');
                var edits = [];
                // nonempty removed = remove from from index
                if (removed.length > 0) {
                    var removeEdit = { isInsert: false, index: idx, text: removed };
                    edits.push(removeEdit);
                }
                // nonempt added = added at index
                if (inserted.length > 0) {
                    var insertEdit = { isInsert: true, index: idx, text: inserted };
                    edits.push(insertEdit);
                }
                if (edits.length > 0 && _this.localEdits) {
                    _this.localEdits.next(edits);
                }
            });
        };
        this.onRemoteCursors = function (cursors) {
            if (!_this.pad)
                return;
            var editor = _this.editor;
            var doc = editor.getDoc();
            var markers = _this.remoteMarkers;
            var users = _this.pad.getAllUsers();
            _this.editor.operation(function () {
                Object.keys(cursors || {}).forEach(function (id) {
                    var cursor = cursors[id];
                    var user = users.get(id);
                    var color = user ? user.getColor().value : Palette_1.PRIMARY.GREY;
                    var start = cursor ? Math.min(cursor.startIndex, cursor.endIndex) : null;
                    var end = cursor ? Math.max(cursor.startIndex, cursor.endIndex) : null;
                    // existing markers can be reused if they haven't changed
                    if (markers.has(id)) {
                        var oldMarker = markers.get(id);
                        var range = indicesFromMarker(oldMarker, doc);
                        // it's gone, out of date, or we've been asked to delete it
                        if (!cursor || start === null || end === null || start !== range.from || end !== range.to) {
                            oldMarker.clear();
                            markers.delete(id);
                        }
                        else {
                            return; // it doesn't need to be changed
                        }
                    }
                    if (!cursor || start === null || end === null)
                        return;
                    // make bookmarks for zero-ranged cursors
                    if (start === end) {
                        var cursorPos = doc.posFromIndex(start);
                        var cursorEl = buildRemoteCursorElem(cursorPos, color);
                        var newMarker_1 = doc.setBookmark(cursorPos, { widget: cursorEl, insertLeft: true });
                        markers.set(id, newMarker_1);
                        return;
                    }
                    // do a marktext for ranged cursors
                    var newMarker = doc.markText(doc.posFromIndex(start), doc.posFromIndex(end), { className: Palette_1.getBackgroundClass(color) });
                    markers.set(id, newMarker);
                });
            });
        };
        this.onLocalCursors = function (instance) {
            if (_this.isDemoMode || _this.applyingRemoteChanges || !_this.localCursors)
                return;
            var localCursor = _this.getLocalCursor();
            var update = {};
            var remote = _this.getRemoteCursors();
            Object.keys(remote || {}).forEach(function (id) { return update[id] = remote[id]; });
            update[_this.localUserId] = localCursor;
            _this.localCursors.next(update);
        };
    }
    EditorComponent.prototype.ngOnInit = function () {
        var _this = this;
        this.editor = CodeMirror_1.buildEditor(this.elementRef.nativeElement);
        this.autoEditor = new AutoEditor_1.AutoEditor();
        this.autoEditsSub = this.autoEditor.getEdits().subscribe(function (edit) { return _this.onRemoteEdits([edit]); });
        this.autoModeSub = this.autoEditor.getMode().subscribe(this.setMode);
        this.editor.on('changes', this.onLocalEdits);
        this.editor.on('cursorActivity', this.onLocalCursors);
        this.ngOnChanges();
    };
    EditorComponent.prototype.ngOnDestroy = function () {
        this.autoEditor.stop();
        this.autoEditsSub.unsubscribe();
        this.autoModeSub.unsubscribe();
        this.editor.off('changes', this.onLocalEdits);
        this.editor.off('cursorActivity', this.onLocalCursors);
        this.ngOnChanges();
    };
    EditorComponent.prototype.ngOnChanges = function () {
        var _this = this;
        this.localUserId = null;
        if (this.mimeSub) {
            this.mimeSub.unsubscribe();
            this.mimeSub = null;
        }
        if (this.remoteEditSub) {
            this.remoteEditSub.unsubscribe();
            this.remoteEditSub = null;
            this.localEdits = null;
        }
        if (this.remoteCursorSub) {
            this.remoteCursorSub.unsubscribe();
            this.remoteCursorSub = null;
            this.localCursors = null;
        }
        var pad = this.pad;
        if (!this.editor)
            return;
        if (!pad || !pad.isStarted())
            this.setDemoMode(true);
        if (!pad)
            return;
        this.localUserId = pad.getLocalUser().getId();
        this.mimeSub = pad.getMimeType().subscribe(function (mime) { return _this.setMode(CodeMirror_1.getModeForMime(mime)); });
        this.remoteEditSub = pad.getRemoteEdits().subscribe(this.onRemoteEdits);
        this.localEdits = pad.getLocalEdits();
        this.remoteCursorSub = pad.getRemoteCursors().subscribe(this.onRemoteCursors);
        this.localCursors = pad.getLocalCursors();
    };
    EditorComponent.prototype.onEditorClick = function (event) {
        this.editor.focus();
    };
    EditorComponent.prototype.getLocalCursor = function () {
        if (!this.editor)
            return null;
        var doc = this.editor.getDoc();
        var selections = doc.listSelections();
        var cursor = doc.getCursor();
        var pos1;
        var pos2;
        if (selections && selections.length > 0) {
            // if we for some reason have more than one selection just send the first one
            pos1 = selections[0].anchor;
            pos2 = selections[0].head;
        }
        else if (cursor) {
            pos1 = cursor;
            pos2 = cursor;
        }
        if (!pos1 || !pos2)
            return null;
        var result = new Protocol_1.Cursor();
        var idx1 = doc.indexFromPos(pos1);
        var idx2 = doc.indexFromPos(pos2);
        result.srcId = this.localUserId;
        result.startIndex = Math.min(idx1, idx2);
        result.endIndex = Math.max(idx1, idx2);
        return result;
    };
    EditorComponent.prototype.getRemoteCursors = function () {
        var cursors = {};
        if (!this.editor)
            return cursors;
        var doc = this.editor.getDoc();
        this.remoteMarkers.forEach(function (marker, id) {
            var cursor = new Protocol_1.Cursor();
            var range = indicesFromMarker(marker, doc);
            cursor.srcId = id;
            cursor.startIndex = range.from;
            cursor.endIndex = range.to;
            cursors[id] = cursor;
        });
        return cursors;
    };
    EditorComponent.prototype.setDemoMode = function (demoMode) {
        if (demoMode === this.isDemoMode)
            return;
        if (demoMode) {
            this.isDemoMode = true;
            this.autoEditor.start(ExampleCode_1.EXAMPLES);
        }
        else {
            this.autoEditor.stop();
            this.editor.setValue('');
            this.setMode(CodeMirror_1.getModeForMime(null));
            this.isDemoMode = false;
        }
    };
    __decorate([
        core_1.Input(), 
        __metadata('design:type', PadModel_1.PadModel)
    ], EditorComponent.prototype, "pad", void 0);
    EditorComponent = __decorate([
        core_1.Component({
            selector: 'editor',
            template: '',
            styleUrls: ['editor.component.scss'],
            encapsulation: core_1.ViewEncapsulation.None,
            host: {
                '(click)': 'onEditorClick($event)'
            }
        }), 
        __metadata('design:paramtypes', [core_1.ElementRef])
    ], EditorComponent);
    return EditorComponent;
}());
exports.EditorComponent = EditorComponent;
function indicesFromMarker(marker, doc) {
    if (!marker)
        return { from: null, to: null };
    var range = marker.find();
    if (!range)
        return { from: null, to: null };
    var fromPos;
    var toPos;
    // typings are wrong, .find on a cursor gives back a pos not a range
    if (range.from === undefined) {
        fromPos = range;
        toPos = range;
    }
    else {
        fromPos = range.from;
        toPos = range.to;
    }
    var fromIdx = fromPos ? doc.indexFromPos(fromPos) : null;
    var toIdx = toPos ? doc.indexFromPos(toPos) : null;
    return (fromIdx > toIdx) ? { from: toIdx, to: fromIdx } : { from: fromIdx, to: toIdx };
}
function buildRemoteCursorElem(pos, color) {
    var el = document.createElement('span');
    el.style.display = 'inline';
    el.style.padding = '0';
    el.style.marginTop = el.style.marginBottom = el.style.marginLeft = el.style.marginRight = '-1px';
    el.style.borderLeftWidth = '2px';
    el.style.borderLeftStyle = 'solid';
    el.style.borderLeftColor = color.val;
    // el.style.zIndex = '0';
    return el;
}
//# sourceMappingURL=editor.component.js.map