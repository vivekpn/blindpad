"use strict";
exports.USE_LOCAL_SIGNALER = false;
exports.REMOTE_SIGNALER_HOST = 'bpsignaler-rmnoon.rhcloud.com';
exports.REMOTE_SIGNALER_PORT = 8443;
/*
 * Phase 1: Peer Discovery
 *
 * Discover who's in our pad, either by asking a central signaller or
 * (eventually) asking other peers that are known to us.
 */
/**
 * Sent by a client at any time when they suspect there might be more
 * peers to discover on the pad.
 */
var PeersRequest = (function () {
    function PeersRequest() {
    }
    PeersRequest.messageType = 'PeersRequest';
    return PeersRequest;
}());
exports.PeersRequest = PeersRequest;
/**
 * Sent by any peer who receives a `PeersRequest`
 */
var PeersUpdate = (function () {
    function PeersUpdate() {
    }
    PeersUpdate.messageType = 'PeersUpdate';
    return PeersUpdate;
}());
exports.PeersUpdate = PeersUpdate;
/*
 * Phase 2: Connection negotation.
 *
 * Try to connect to specific peers in the pad by sending out our connection
 * blob (to either the signaler or other peers) and waiting for responses with
 * other peers' connection blob.
 */
// IDEA: make connection requests / responses plural by default
/**
 * Sent by a client who's trying to connect to the supplied peer.
 */
var ConnectionRequest = (function () {
    function ConnectionRequest() {
    }
    ConnectionRequest.messageType = 'ConnectionRequest';
    return ConnectionRequest;
}());
exports.ConnectionRequest = ConnectionRequest;
/**
 * Sent by a peer who's responding to a connection request.
 */
var ConnectionResponse = (function () {
    function ConnectionResponse() {
    }
    ConnectionResponse.messageType = 'ConnectionResponse';
    return ConnectionResponse;
}());
exports.ConnectionResponse = ConnectionResponse;
/*
 * Phase 3: Pad syncing
 * TODO: explain how it works
 */
var PadUpdate = (function () {
    function PadUpdate() {
    }
    PadUpdate.messageType = 'PadUpdate';
    return PadUpdate;
}());
exports.PadUpdate = PadUpdate;
var UserStatusRequest = (function () {
    function UserStatusRequest() {
    }
    UserStatusRequest.messageType = 'UserStatusRequest';
    return UserStatusRequest;
}());
exports.UserStatusRequest = UserStatusRequest;
var UserStatusResponse = (function () {
    function UserStatusResponse() {
    }
    UserStatusResponse.messageType = 'UserStatusResponse';
    return UserStatusResponse;
}());
exports.UserStatusResponse = UserStatusResponse;
var PadEdit = (function () {
    function PadEdit() {
    }
    return PadEdit;
}());
exports.PadEdit = PadEdit;
var Cursor = (function () {
    function Cursor() {
    }
    return Cursor;
}());
exports.Cursor = Cursor;
/**
 * Returns null if we should use the same domain as we're being served on.
 */
function getSignalerURI() {
    return getSignalerProtocol() + "://" + getSignalerHost() + ":" + getSignalerPort() + "/bp";
}
exports.getSignalerURI = getSignalerURI;
function getSignalerHost() {
    if (process.env.NODE_IP)
        return process.env.NODE_IP;
    return exports.USE_LOCAL_SIGNALER ? '127.0.0.1' : exports.REMOTE_SIGNALER_HOST;
}
exports.getSignalerHost = getSignalerHost;
function getSignalerPort() {
    if (process.env.NODE_PORT)
        return process.env.NODE_PORT;
    return exports.USE_LOCAL_SIGNALER ? 3000 : exports.REMOTE_SIGNALER_PORT;
}
exports.getSignalerPort = getSignalerPort;
function getSignalerProtocol() {
    return exports.USE_LOCAL_SIGNALER ? 'http' : 'https';
}
exports.getSignalerProtocol = getSignalerProtocol;
//# sourceMappingURL=Protocol.js.map