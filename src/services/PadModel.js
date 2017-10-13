"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var uuid = require("node-uuid");
var io = require("socket.io-client");
var Subject_1 = require("rxjs/Subject");
var BehaviorSubject_1 = require("rxjs/BehaviorSubject");
var kseq_1 = require("../kseq");
var Protocol_1 = require("../signaler/Protocol");
var UserModel_1 = require("./UserModel");
var Compress_1 = require("../util/Compress");
var Diff_1 = require("../util/Diff");
var Observables_1 = require("../util/Observables");
var Random_1 = require("../util/Random");
var Debounce_1 = require("../util/Debounce");
/**
 * After how many milliseconds without an edit can we trigger a pad compaction (assuming all other conditions are met?)
 */
var COMPACTION_DELAY_MS = 4000;
var PEER_TIMEOUT_POLL_MS = 5000;
var COMPACTION_POLL_MS = 1000;
var PadModel = (function () {
    function PadModel(padId, blindpadService) {
        var _this = this;
        this.padId = padId;
        this.blindpadService = blindpadService;
        this.useLog = true;
        this.debouncedIsLightweight = true;
        this.onLocalEdits = function (edits) {
            if (!edits || edits.length === 0)
                return;
            var newOps = [];
            edits.forEach(function (edit) {
                var text = edit.text;
                var idx = edit.index;
                if (edit.isInsert) {
                    for (var i = text.length - 1; i >= 0; i--) {
                        var op = _this.doc.insert(text.charAt(i), idx);
                        newOps.push(op);
                    }
                }
                else {
                    for (var i = 0, l = text.length; i < l; i++) {
                        var op = _this.doc.remove(idx);
                        newOps.push(op);
                    }
                }
            });
            if (newOps.length > 0) {
                newOps.forEach(function (op) { return _this.opSet.add(op.toString()); });
                _this.memoizedOpSetStr = null; // clear a saved value since we changed the canonical one
                _this.firePadUpdate(false);
            }
        };
        this.onPadUpdate = function (update) {
            if (update.mimeType !== undefined && update.mimeType !== _this.mimeType.value) {
                _this.mimeType.next(update.mimeType);
            }
            if (update.base !== undefined && update.baseVersion !== undefined && update.opSetStr !== undefined) {
                if (_this.base === update.base && _this.baseVersion === update.baseVersion) {
                    // regular update: we agree on base and version, let's just combine our ops and be done
                    var opsToApply_1 = [];
                    var haveUpdate = !!update.opSetStr;
                    var sameAsMemoized = _this.memoizedOpSetStr && _this.memoizedOpSetStr === update.opSetStr;
                    if (haveUpdate && !sameAsMemoized) {
                        Compress_1.decompressOpSet(update.opSetStr).forEach(function (op) {
                            if (!_this.opSet.has(op))
                                opsToApply_1.push(op);
                        });
                    }
                    _this.applyOpsAndRender(opsToApply_1);
                }
                else if (update.baseVersion > _this.baseVersion) {
                    // remote is newer, blow ours away
                    _this.setBaseDoc(update.base, update.baseVersion);
                    _this.applyOpsAndRender(Compress_1.decompressOpSet(update.opSetStr));
                }
                else if (_this.baseVersion === update.baseVersion && _this.base !== update.base) {
                    // we must've had a split compaction (two people thought they were the master and advanced)
                    if (update.srcId > _this.clientId) {
                        // accept the bigger client's view of reality
                        _this.setBaseDoc(update.base, update.baseVersion);
                        _this.applyOpsAndRender(Compress_1.decompressOpSet(update.opSetStr));
                    }
                }
            }
            if (update.cursors !== undefined) {
                var newCursors_1 = {};
                Object.keys(update.cursors || {}).forEach(function (userId) {
                    var cursor = update.cursors[userId];
                    // ignore the cursor if they're not alive
                    if (!_this.activeUsers.has(userId))
                        return;
                    // ignore ours (this is only for remote cursors: we trust ourselves to know our own cursor)
                    if (userId === _this.clientId)
                        return;
                    // we could either take every cursor with every update
                    // or we could only update the ones coming authoritatively from the sender
                    // of the update and allow the pad changes / codemirror logic to do the rest.
                    // we're going to do the latter for now
                    if (userId === update.srcId) {
                        newCursors_1[userId] = cursor;
                    }
                });
                _this.remoteCursors.next(newCursors_1);
            }
        };
        this.onLocalCursors = function (cursors) {
            _this.mostRecentCursors = cursors;
            _this.firePadUpdate(true);
        };
        this.onCompactionTick = function () {
            // if (1 === 1) return; // disble compaction
            // conditions under which we should broadcast a compaction:
            // we're not dead
            if (!_this.activePeers.has(_this.clientId))
                return;
            // we have an opset
            if (_this.opSet.size === 0)
                return;
            // we're the largest client id in the swarm (kind of a janky master)
            if (!_this.isLargestPeer())
                return;
            // we're either by ourself or we have at least one responsive peer (i.e. we're not totally isolated from the swarm)
            if (_this.activePeers.size > 1 && _this.getResponsivePeers().length === 0)
                return;
            // it's been more than a certain fixed amount of time since the last pad edit
            if (Date.now() - _this.lastEditTime < COMPACTION_DELAY_MS)
                return;
            _this.setBaseDoc(_this.doc.toArray().join(''), _this.baseVersion + 1);
            _this.sendUpdateNow(false);
        };
        this.onPeerTimeoutTick = function () {
            // conditions under which we should broadcast timed out peers as dead
            // we're not dead
            if (!_this.activePeers.has(_this.clientId))
                return;
            // we have peers
            if (_this.activePeers.size < 2)
                return;
            // at least one of them is timed out
            if (_this.getTimedOutPeers().length === 0)
                return;
            // we can hit the network (to ensure we're not isolated)
            var req = new XMLHttpRequest();
            req.onreadystatechange = function () {
                if (req.readyState !== XMLHttpRequest.DONE || req.status !== 200)
                    return;
                // we know we're online
                var timedOutIds = _this.getTimedOutPeers().map(function (user) { return user.getId(); });
                if (timedOutIds.length > 0)
                    _this.killUsersAndSignal(timedOutIds);
            };
            req.timeout = PEER_TIMEOUT_POLL_MS / 2;
            req.open('GET', "/index.html?t=" + Date.now(), true); // prevent caching
            req.send();
        };
        this.signalRequest = function (req) {
            _this.signaler.emit(Protocol_1.ConnectionRequest.messageType, req);
        };
        this.signalResponse = function (res) {
            _this.signaler.emit(Protocol_1.ConnectionResponse.messageType, res);
        };
        this.clientId = uuid.v1();
        this.activePeers = new Set();
        this.deadPeers = new Set();
        this.users = new Map();
        this.mimeType = new BehaviorSubject_1.BehaviorSubject(null);
        this.mostRecentCursors = null;
        this.outgoingUserBroadcasts = new Subject_1.Subject();
        this.localEdits = new Subject_1.Subject();
        this.remoteEdits = new Subject_1.Subject();
        this.localCursors = new Subject_1.Subject();
        this.remoteCursors = new Subject_1.Subject();
        this.localEdits.subscribe(this.onLocalEdits);
        this.localCursors.subscribe(this.onLocalCursors);
        this.localEdits.subscribe(function (edits) { return _this.lastEditTime = Date.now(); });
        this.remoteEdits.subscribe(function (edits) { return _this.lastEditTime = Date.now(); });
        this.activePeers.add(this.clientId);
        this.updateUsers([], []);
        this.setBaseDoc('', 0);
    }
    PadModel.prototype.getPadId = function () { return this.padId; };
    PadModel.prototype.getClientId = function () { return this.clientId; };
    PadModel.prototype.getLocalUser = function () { return this.users.get(this.clientId); };
    PadModel.prototype.getUsers = function () { return this.activeUsers; };
    PadModel.prototype.getAllUsers = function () { return this.users; };
    PadModel.prototype.log = function () {
        var msg = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            msg[_i] = arguments[_i];
        }
        if (this.useLog)
            console.log.apply(console, [''].concat(msg));
    }; // tslint:disable-line
    PadModel.prototype.isSignalerConnected = function () { return this.signaler && this.signaler.connected; };
    PadModel.prototype.getOutoingUserBroadcasts = function () { return this.outgoingUserBroadcasts; };
    PadModel.prototype.getLocalEdits = function () { return this.localEdits; };
    PadModel.prototype.getRemoteEdits = function () { return this.remoteEdits; };
    PadModel.prototype.getLocalCursors = function () { return this.localCursors; };
    PadModel.prototype.getRemoteCursors = function () { return this.remoteCursors; };
    PadModel.prototype.getMimeType = function () { return this.mimeType; };
    PadModel.prototype.setMimeType = function (mime) { if (mime !== this.mimeType.value)
        this.mimeType.next(mime); };
    PadModel.prototype.buildPadUpdate = function (isLightweight) {
        if (isLightweight === void 0) { isLightweight = true; }
        var update = new Protocol_1.PadUpdate();
        update.srcId = this.clientId;
        update.padId = this.padId;
        if (this.mimeType.value)
            update.mimeType = this.mimeType.value;
        if (this.mostRecentCursors)
            update.cursors = this.mostRecentCursors;
        if (!isLightweight) {
            update.base = this.base;
            update.baseVersion = this.baseVersion;
            if (this.memoizedOpSetStr === null) {
                this.memoizedOpSetStr = Compress_1.compressOpSet(this.opSet);
            }
            update.opSetStr = this.memoizedOpSetStr;
        }
        return update;
    };
    PadModel.prototype.start = function () {
        var _this = this;
        if (this.isStarted())
            return; // already started
        var signalerURI = Protocol_1.getSignalerURI();
        this.log('Looking for signaler: ', signalerURI);
        this.signaler = io.connect(signalerURI);
        this.remoteEdits.next([]); // kind of a hack, tells the editor that we're starting
        this.setMimeType(null);
        this.signaler.on('connect', function () {
            _this.log('Connected to signaler, asking for peers!');
            var req = new Protocol_1.PeersRequest();
            req.padId = _this.padId;
            req.srcId = _this.clientId;
            req.knownActivePeers = Array.from(_this.activePeers.values());
            req.knownDeadPeers = Array.from(_this.deadPeers.values());
            _this.signaler.emit(Protocol_1.PeersRequest.messageType, req);
        });
        this.signaler.on(Protocol_1.PeersRequest.messageType, function (data) {
            _this.log(Protocol_1.PeersRequest.messageType, data);
            if (!_this.isValidMessage(data))
                return;
            _this.updateUsers(data.knownActivePeers, data.knownDeadPeers);
            // TODO: don't send response if they knew the same or more than us
            var update = new Protocol_1.PeersUpdate();
            update.padId = _this.padId;
            update.srcId = _this.clientId;
            update.activePeers = Array.from(_this.activePeers.values());
            update.deadPeers = Array.from(_this.deadPeers.values());
            _this.signaler.emit(Protocol_1.PeersUpdate.messageType, update);
        });
        this.signaler.on(Protocol_1.PeersUpdate.messageType, function (data) {
            _this.log(Protocol_1.PeersUpdate.messageType, data);
            if (!_this.isValidMessage(data))
                return;
            _this.updateUsers(data.activePeers, data.deadPeers);
        });
        this.signaler.on(Protocol_1.ConnectionRequest.messageType, function (data) {
            _this.log(Protocol_1.ConnectionRequest.messageType, data);
            if (!_this.isValidConnectionMessage(data))
                return;
            _this.users.get(data.srcId).feedMessage(Protocol_1.ConnectionRequest.messageType, data);
        });
        this.signaler.on(Protocol_1.ConnectionResponse.messageType, function (data) {
            _this.log(Protocol_1.ConnectionResponse.messageType, data);
            if (!_this.isValidConnectionMessage(data))
                return;
            _this.users.get(data.srcId).feedMessage(Protocol_1.ConnectionResponse.messageType, data);
        });
        this.signaler.on('DEBUG', function (data) { _this.log('DEBUG (signaler): ', data); });
        this.signaler.on('disconnect', function () { _this.log('disconnected from signaler'); });
        this.mimeType.subscribe(function (type) {
            if (type)
                _this.firePadUpdate(true);
        });
        this.peerTimeoutSub = Observables_1.interval(PEER_TIMEOUT_POLL_MS).subscribe(this.onPeerTimeoutTick);
        this.compactionSub = Observables_1.interval(COMPACTION_POLL_MS).subscribe(this.onCompactionTick);
    };
    PadModel.prototype.close = function () {
        if (!this.isStarted())
            return;
        this.killUsersAndSignal([this.clientId]);
        this.users.forEach(function (user) { user.close(); });
        this.users.clear();
        if (this.signaler)
            this.signaler.close();
        this.mimeType.complete();
        this.localEdits.complete();
        this.remoteEdits.complete();
        this.localCursors.complete();
        this.remoteCursors.complete();
        this.peerTimeoutSub.unsubscribe();
        this.compactionSub.unsubscribe();
    };
    PadModel.prototype.isStarted = function () {
        return !!this.signaler;
    };
    /* private methods */
    PadModel.prototype.updateUsers = function (actives, deads) {
        var _this = this;
        // process any new peer information in the request
        actives.forEach(function (activeId) {
            // old news
            if (_this.deadPeers.has(activeId)) {
                return;
            }
            _this.activePeers.add(activeId);
        });
        deads.forEach(function (deadId) {
            if (_this.activePeers.has(deadId)) {
                _this.activePeers.delete(deadId);
            }
            _this.deadPeers.add(deadId);
        });
        var oldUsers = this.users;
        this.users = new Map();
        this.activeUsers = new Map();
        [this.activePeers, this.deadPeers].forEach(function (set) {
            set.forEach(function (peerId) {
                var user = oldUsers.get(peerId);
                if (!user) {
                    user = new UserModel_1.UserModel(peerId, _this, _this.blindpadService);
                    if (_this.activePeers.has(peerId)) {
                        user.getMessagesOut(Protocol_1.ConnectionRequest.messageType).subscribe(_this.signalRequest);
                        user.getMessagesOut(Protocol_1.ConnectionResponse.messageType).subscribe(_this.signalResponse);
                        user.getMessagesIn(Protocol_1.PadUpdate.messageType).subscribe(_this.onPadUpdate);
                    }
                }
                _this.users.set(peerId, user);
                if (_this.activePeers.has(peerId)) {
                    _this.activeUsers.set(peerId, user);
                    if (!user.isStarted())
                        user.start();
                }
                if (_this.deadPeers.has(peerId)) {
                    if (!user.isClosed()) {
                        user.close();
                        // make sure to clear the cursor of anyone we see die
                        var tombstoneCursor = {};
                        tombstoneCursor[peerId] = null;
                        _this.remoteCursors.next(tombstoneCursor);
                    }
                }
            });
        });
    };
    PadModel.prototype.applyOpsAndRender = function (ops) {
        var _this = this;
        ops = ops || [];
        if (ops.length === 0)
            return;
        var oldVersion = this.doc.toArray().join('');
        var numApplied = 0;
        ops.forEach(function (op) {
            if (_this.opSet.has(op))
                return;
            _this.doc.apply(kseq_1.Op.parse(op));
            _this.opSet.add(op);
            numApplied++;
        });
        if (numApplied === 0)
            return;
        var newVersion = this.doc.toArray().join('');
        var versionDiff = Diff_1.diffStrings(oldVersion, newVersion);
        var idx = 0;
        var edits = [];
        versionDiff.forEach(function (_a) {
            var type = _a[0], value = _a[1];
            if (type === Diff_1.DIFF_INSERT) {
                var insert = new Protocol_1.PadEdit();
                insert.index = idx;
                insert.isInsert = true;
                insert.text = value;
                edits.push(insert);
            }
            else if (type === Diff_1.DIFF_DELETE) {
                var remove = new Protocol_1.PadEdit();
                remove.index = idx;
                remove.isInsert = false;
                remove.text = value;
                edits.push(remove);
            }
            if (type !== Diff_1.DIFF_DELETE)
                idx += value.length;
        });
        if (edits.length > 0)
            this.remoteEdits.next(edits);
    };
    /**
     * Broadcast an update in our version of the pad to other users: to save on bandwidth
     * calls to this will be debounced based on the size of the current opSet (which dominates the
     * size of the message).
     */
    PadModel.prototype.firePadUpdate = function (isLightweight) {
        var _this = this;
        this.debouncedIsLightweight = !!this.debouncedIsLightweight && isLightweight;
        if (!this.debouncedPadUpdate) {
            var delay_1 = 25 * Math.pow(Math.log10(this.opSet.size + 1), 2);
            this.debouncedPadUpdate = Debounce_1.debounce(function () {
                _this.sendUpdateNow(_this.debouncedIsLightweight);
                _this.debouncedPadUpdate = null;
                _this.debouncedIsLightweight = true;
            }, delay_1);
        }
        this.debouncedPadUpdate();
    };
    PadModel.prototype.sendUpdateNow = function (isLightweight) {
        this.outgoingUserBroadcasts.next({ type: Protocol_1.PadUpdate.messageType, data: this.buildPadUpdate(isLightweight) });
    };
    PadModel.prototype.getResponsivePeers = function () {
        return Array.from(this.activeUsers.values()).filter(function (user) { return user.isRemoteUser() && !user.isUnavailable(); });
    };
    PadModel.prototype.getTimedOutPeers = function () {
        return Array.from(this.activeUsers.values()).filter(function (user) { return user.isRemoteUser() && user.isTimedOut(); });
    };
    PadModel.prototype.isLargestPeer = function () {
        return this.clientId !== Array.from(this.activePeers).reduce(function (prev, cur) { return cur > prev ? cur : prev; });
    };
    PadModel.prototype.killUsersAndSignal = function (peerIds) {
        this.updateUsers([], peerIds);
        var update = new Protocol_1.PeersUpdate();
        update.padId = this.padId;
        update.srcId = this.clientId;
        update.activePeers = Array.from(this.activePeers.values());
        update.deadPeers = Array.from(this.deadPeers.values());
        this.signaler.emit(Protocol_1.PeersUpdate.messageType, update);
    };
    PadModel.prototype.setBaseDoc = function (base, version) {
        var oldVersion = this.doc ? this.doc.toArray().join('') : '';
        this.base = base;
        this.baseVersion = version;
        this.doc = new kseq_1.KSeq(this.clientId.substring(0, 6)); // this is probably way too collision-happy
        this.opSet = new Set();
        // for correctness our "base" text" just implies a set of operations
        // that all peers agree on (in this case made by a simulated third party)
        var rng = new Random_1.SeededRandom(version);
        var baseDoc = new kseq_1.KSeq('' + version, function () { return version; }, function () { return rng.random(); });
        for (var i = 0, l = base.length; i < l; i++) {
            this.doc.apply(baseDoc.insert(base.charAt(i), i));
        }
        this.memoizedOpSetStr = null;
        this.lastEditTime = Date.now();
        // if post-compaction the doc has changed flush the new version of the doc as remove+insert edits
        if (oldVersion !== this.base) {
            var remove = new Protocol_1.PadEdit();
            remove.index = 0;
            remove.isInsert = false;
            remove.text = oldVersion;
            var add = new Protocol_1.PadEdit();
            add.index = 0;
            add.isInsert = true;
            add.text = this.base;
            this.remoteEdits.next([remove, add]);
        }
    };
    PadModel.prototype.isValidMessage = function (msg) {
        if (msg.padId !== this.padId) {
            console.log("Message padId (" + msg.padId + ") doesn't match local padId: " + this.padId + ", ignoring..."); // tslint:disable-line
            return false;
        }
        return true;
    };
    PadModel.prototype.isValidConnectionMessage = function (msg) {
        if (!this.isValidMessage(msg))
            return false;
        if (!msg.destId || msg.destId !== this.clientId) {
            this.log('destId missing or not for us, ignoring...');
            return false;
        }
        if (!msg.srcId) {
            this.log('srcId missing, ignoring...');
            return false;
        }
        if (!this.activePeers.has(msg.srcId)) {
            this.log("srcId " + msg.srcId + " not an active peer, ignoring...");
            return false;
        }
        return true;
    };
    return PadModel;
}());
exports.PadModel = PadModel;
//# sourceMappingURL=PadModel.js.map