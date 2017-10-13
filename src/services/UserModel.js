"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var BehaviorSubject_1 = require("rxjs/BehaviorSubject");
var Subject_1 = require("rxjs/Subject");
require("rxjs/add/operator/filter");
require("rxjs/add/operator/take");
require("rxjs/add/operator/map");
var VoiceAnalyser_1 = require("../util/VoiceAnalyser");
var Names_1 = require("../util/Names");
var Palette_1 = require("../util/Palette");
var Chunker_1 = require("../util/Chunker");
var Observables_1 = require("../util/Observables");
var Protocol_1 = require("../signaler/Protocol");
var PEER_CONFIG = {
    iceServers: [
        {
            urls: [
                'stun:stun.l.google.com:19302',
                'stun:stun1.l.google.com:19302',
                'stun:stun2.l.google.com:19302',
                'stun:stun3.l.google.com:19302',
                'stun:stun4.l.google.com:19302'
            ]
        }
    ]
};
var DATA_CHANNEL_CONFIG = {
    ordered: true
};
var DATA_CHANNEL_NAME = 'bp';
var DATA_CHANNEL_MAX_MESSAGE_SIZE = 60000; // the internet says not to go over 64k with webrtc data channels right now
/**
 * How often should we send proactive heartbeats to another user?
 */
var HEARTBEAT_FREQUENCY_MS = 3000;
/**
 * After how long since our last message should we indicate to the user that this peer is out of contact / unavailable?
 */
var PEER_UNAVAILABLE_MS = 2.2 * HEARTBEAT_FREQUENCY_MS;
/**
 * Any user who hasn't responded within this amount of time is considered fair game to be timed out and killed from the swarm
 */
var PEER_TIMEOUT_MS = 25000;
var UserModel = (function () {
    function UserModel(userId, pad, blindpadService) {
        var _this = this;
        this.userId = userId;
        this.pad = pad;
        this.blindpadService = blindpadService;
        this.sendHeartbeatRequest = function () {
            var req = new Protocol_1.UserStatusRequest();
            req.srcId = _this.pad.getLocalUser().getId();
            req.destId = _this.getId();
            req.padId = _this.pad.getPadId();
            _this.messagesOut.next({ type: Protocol_1.UserStatusRequest.messageType, data: req });
        };
        this.sendHeartbeatResponse = function (sendPadUpdate) {
            if (sendPadUpdate === void 0) { sendPadUpdate = false; }
            var res = new Protocol_1.UserStatusResponse();
            res.srcId = _this.pad.getLocalUser().getId();
            res.destId = _this.getId();
            res.name = _this.pad.getLocalUser().getName().value;
            if (sendPadUpdate)
                res.update = _this.pad.buildPadUpdate(false);
            _this.messagesOut.next({ type: Protocol_1.UserStatusResponse.messageType, data: res });
        };
        this.color = new BehaviorSubject_1.BehaviorSubject(Palette_1.getColor(0, true, true));
        this.closed = false;
        this.started = false;
        this.name = new BehaviorSubject_1.BehaviorSubject(this.isLocalUser() ? Names_1.getAnimalName() : null);
        this.audioStream = new BehaviorSubject_1.BehaviorSubject(null);
        this.isMuted = this.isLocalUser() ? this.blindpadService.mediaService.getIsMuted() : new BehaviorSubject_1.BehaviorSubject(false);
        this.voiceAnalyser = this.isLocalUser() ? this.blindpadService.mediaService.getLocalAnalyser() : new VoiceAnalyser_1.VoiceAnalyser(this.blindpadService.mediaService.getAudioContext(), this.blindpadService.zone);
        this.messagesOut = new Subject_1.Subject();
        this.messagesIn = new Subject_1.Subject();
        this.peerCxn = new BehaviorSubject_1.BehaviorSubject(null);
        this.channel = new BehaviorSubject_1.BehaviorSubject(null);
        this.chunker = new Chunker_1.Chunker(DATA_CHANNEL_MAX_MESSAGE_SIZE);
        this.dechunker = new Chunker_1.Dechunker();
        this.broadcastSub = null;
        this.heartbeatSub = null;
        this.lastMessageTime = null;
    }
    UserModel.prototype.getId = function () { return this.userId; };
    UserModel.prototype.getName = function () { return this.name; };
    UserModel.prototype.getColor = function () { return this.color; };
    UserModel.prototype.isLocalUser = function () { return this.userId === this.pad.getClientId(); };
    UserModel.prototype.isRemoteUser = function () { return !this.isLocalUser(); };
    UserModel.prototype.isClosed = function () { return this.closed; };
    UserModel.prototype.isStarted = function () { return this.started; };
    UserModel.prototype.isUnavailable = function () { return this.isRemoteUser() && Date.now() - this.lastMessageTime > PEER_UNAVAILABLE_MS; };
    UserModel.prototype.isTimedOut = function () { return this.isRemoteUser() && Date.now() - this.lastMessageTime > PEER_TIMEOUT_MS; };
    UserModel.prototype.getAudioStream = function () { return this.audioStream; };
    UserModel.prototype.getIsMuted = function () { return this.isMuted; };
    UserModel.prototype.setMuted = function (muted) {
        if (muted === void 0) { muted = !this.getIsMuted().value; }
        this.isMuted.next(!!muted);
    };
    UserModel.prototype.getVoiceAnalyser = function () { return this.voiceAnalyser; };
    /**
     * Get an incoming stream of messages (of the supplied type) from this remote user as they arrive
     */
    UserModel.prototype.getMessagesIn = function (type) { return this.messagesIn.filter(function (msg) { return msg.type === type; }).map(function (msg) { return msg.data; }); };
    /**
     * Get an outgoing stream of messages (of the supplied type) to this remote user as they are sent
     */
    UserModel.prototype.getMessagesOut = function (type) { return this.messagesOut.filter(function (msg) { return msg.type === type; }).map(function (msg) { return msg.data; }); };
    /**
     * Feed this model an incoming message (as if it had arrived from the remote user)
     */
    UserModel.prototype.feedMessage = function (type, data) { this.messagesIn.next({ type: type, data: data }); };
    UserModel.prototype.start = function () {
        if (this.isStarted())
            return;
        this.started = true;
        if (this.isLocalUser()) {
            this.pad.log('Local user is: ', this.userId);
            return;
        }
        this.color.next(Palette_1.getColor(this.pad.getUsers() ? this.pad.getUsers().size : 0, true, true));
        this.lastMessageTime = Date.now();
        this.setupSubs();
        this.setupRtc();
    };
    UserModel.prototype.close = function () {
        if (this.isLocalUser() || this.isClosed() || !this.isStarted())
            return;
        this.closed = true;
        this.broadcastSub.unsubscribe();
        this.broadcastSub = null;
        this.heartbeatSub.unsubscribe();
        this.heartbeatSub = null;
        this.messagesOut.complete();
        this.messagesIn.complete();
        this.peerCxn.filter(function (cxn) { return !!cxn; }).take(1).subscribe(function (cxn) { return cxn.close(); });
        this.peerCxn.complete();
        this.channel.filter(function (channel) { return !!channel; }).take(1).subscribe(function (channel) { return channel.close(); });
        this.channel.complete();
        this.audioStream.next(null);
        this.audioStream.complete();
    };
    UserModel.prototype.isCaller = function () { return this.pad.getClientId() > this.userId; };
    UserModel.prototype.isReceiver = function () { return !this.isCaller(); };
    UserModel.prototype.setupSubs = function () {
        var _this = this;
        this.broadcastSub = this.pad.getOutoingUserBroadcasts().subscribe(function (msg) { return _this.messagesOut.next(msg); });
        this.heartbeatSub = Observables_1.interval(HEARTBEAT_FREQUENCY_MS).subscribe(function (time) {
            _this.sendHeartbeatRequest();
        });
        // when the chunker emits a message chunk send it over the channel (when it's ready)
        this.chunker.chunks.subscribe(function (chunk) {
            _this.channel.filter(function (channel) { return channel && channel.readyState === 'open'; }).take(1)
                .subscribe(function (channel) {
                channel.send(chunk);
                // console.error('sent ', chunk.length, chunk.substring(0, 20));
            });
        });
        // when the dechunker emits a message send it to our local pipe
        this.dechunker.messages.subscribe(function (message) {
            _this.lastMessageTime = Date.now();
            // console.error('received msg: ', message.length, message.substring(0, 20));
            _this.messagesIn.next(JSON.parse(message));
        });
        // when we get a message (that somebody local wants to send) send it off to our chunker
        this.messagesOut
            .filter(function (message) { return message.type !== Protocol_1.ConnectionRequest.messageType && message.type !== Protocol_1.ConnectionResponse.messageType; }) // these types are sent to the signaler instead of the webrtc channel
            .subscribe(function (message) {
            var str = JSON.stringify(message);
            _this.chunker.messages.next(str);
            // console.error('sent msg: ', str.length, str.substring(0, 20));
        });
        // when we get a cxn request or response feed it to the next available peer socket (which should be hungry for it)  
        this.getMessagesIn(Protocol_1.ConnectionRequest.messageType).take(1).subscribe(function (request) {
            _this.peerCxn.filter(function (cxn) { return !!cxn; }).take(1) // idea: filter on the cxn state instead of taking the first 
                .subscribe(function (cxn) {
                cxn.setRemoteDescription(JSON.parse(request.requestBlob));
                cxn.createAnswer().then(function (desc) { cxn.setLocalDescription(desc); }, function (error) { console.error('Error creating answer to ', _this.userId, error); });
            });
        });
        this.getMessagesIn(Protocol_1.ConnectionResponse.messageType).take(1).subscribe(function (response) {
            _this.peerCxn.filter(function (cxn) { return !!cxn; }).take(1)
                .subscribe(function (cxn) {
                cxn.setRemoteDescription(JSON.parse(response.responseBlob));
            });
        });
        // when we get a heartbeat request we should reply immediately
        this.getMessagesIn(Protocol_1.UserStatusRequest.messageType).subscribe(function (request) {
            _this.sendHeartbeatResponse();
        });
        this.getMessagesIn(Protocol_1.UserStatusResponse.messageType).subscribe(function (response) {
            if (_this.name.value !== response.name) {
                _this.pad.log('Received name from ', response.srcId, ' / ', response.name);
                _this.name.next(response.name);
            }
            // if we got an update then feed it to ourselves
            if (response.update)
                _this.feedMessage(Protocol_1.PadUpdate.messageType, response.update);
        });
        this.audioStream.subscribe(function (stream) {
            if (_this.isLocalUser())
                return; // shouldn't happen, but just in case we don't want to screw with the local user's analyser
            _this.voiceAnalyser.stop();
            if (stream) {
                var ctx = _this.blindpadService.mediaService.getAudioContext();
                _this.voiceAnalyser.start(ctx.createMediaStreamSource(stream));
            }
        });
    };
    UserModel.prototype.setupRtc = function () {
        var _this = this;
        var pc = new RTCPeerConnection(PEER_CONFIG);
        pc.onicecandidate = function (candidate) {
            // Firing this callback with a null candidate indicates that
            // trickle ICE gathering has finished, and all the candidates
            // are now present in pc.localDescription.  Waiting until now
            // to create the offer / answer saves us from having to send offer +
            // answer + iceCandidates separately.
            if (candidate.candidate !== null)
                return;
            var desc = pc.localDescription;
            if (_this.isReceiver()) {
                var res = new Protocol_1.ConnectionResponse();
                res.srcId = _this.pad.getClientId();
                res.destId = _this.userId;
                res.padId = _this.pad.getPadId();
                res.responseBlob = JSON.stringify(desc);
                _this.messagesOut.next({ type: Protocol_1.ConnectionResponse.messageType, data: res });
            }
            else if (_this.isCaller()) {
                var req = new Protocol_1.ConnectionRequest();
                req.srcId = _this.pad.getClientId();
                req.destId = _this.userId;
                req.padId = _this.pad.getPadId();
                req.requestBlob = JSON.stringify(desc);
                _this.messagesOut.next({ type: Protocol_1.ConnectionRequest.messageType, data: req });
            }
        };
        // pc.onsignalingstatechange = event => console.log('cxn [onsignalingstatechange]: ', event);
        // pc.onopen = event => console.log('cxn [onopen]: ', event);
        pc.onaddstream = function (event) { return _this.audioStream.next(event.stream); };
        if (this.blindpadService.mediaService.getLocalStream().value) {
            pc.addStream(this.blindpadService.mediaService.getLocalStream().value);
        }
        var setupChannel = function (channel) {
            channel.onopen = function (event) { return _this.sendHeartbeatResponse(true); };
            // channel.onerror = event => console.error('channel [onerror]: ', this.userId, event);
            channel.onclose = function (event) { return console.error('channel [onclose]: ', _this.userId, event); };
            channel.onmessage = function (event) {
                _this.blindpadService.zone.run(function () {
                    var data = event.data;
                    // console.error('received ', data.length, data.substring(0, 20));
                    _this.dechunker.chunks.next(data);
                });
            };
            _this.channel.next(channel);
        };
        if (this.isCaller()) {
            // If you don't make a datachannel *before* making your offer (such
            // that it's included in the offer), then when you try to make one
            // afterwards it just stays in "connecting" state forever.
            setupChannel(pc.createDataChannel(DATA_CHANNEL_NAME, DATA_CHANNEL_CONFIG));
            pc.createOffer().then(function (desc) { pc.setLocalDescription(desc); }, function (error) { console.error('Error generating offer to ', _this.userId, error); });
        }
        else if (this.isReceiver()) {
            pc.ondatachannel = function (event) { return setupChannel(event.channel); };
        }
        this.peerCxn.next(pc);
    };
    return UserModel;
}());
exports.UserModel = UserModel;
//# sourceMappingURL=UserModel.js.map