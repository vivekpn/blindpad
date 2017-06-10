"use strict";
var SocketIO = require('socket.io');
var express = require('express');
var os = require('os');
var basicAuth = require('basic-auth');
var Protocol_1 = require('./Protocol');
var Auth_1 = require('./Auth');
var Signaler = (function () {
    function Signaler() {
        this.app = express();
        this.useDebug = false;
        this.useLog = true;
        this.numSockets = 0;
        this.numPadsMemo = null; // memoized
    }
    Signaler.prototype.start = function (port, host) {
        var _this = this;
        this.port = port;
        this.host = host;
        this.server = this.app.listen(port, host, function () {
            console.log("Signaler listening on " + host + ":" + port); // tslint:disable-line
        });
        this.app.set('json spaces', 2);
        this.app.use('/bpstatus', auth(Auth_1.STATUS_USERNAME, Auth_1.STATUS_PASSWORD));
        this.app.get('/bpstatus', function (req, res) { return res.json(_this.getStatus()); });
        this.io = SocketIO(this.server);
        this.io.of('/bp').on('connection', function (socket) {
            _this.log(socket, 'connected');
            _this.numSockets++;
            socket.on(Protocol_1.PeersRequest.messageType, function (data) {
                _this.log(socket, Protocol_1.PeersRequest.messageType, data);
                _this.broadcastToPad(socket, data.padId, Protocol_1.PeersRequest.messageType, data);
            });
            socket.on(Protocol_1.PeersUpdate.messageType, function (data) {
                _this.log(socket, Protocol_1.PeersUpdate.messageType, data);
                _this.broadcastToPad(socket, data.padId, Protocol_1.PeersUpdate.messageType, data);
            });
            socket.on(Protocol_1.ConnectionRequest.messageType, function (data) {
                _this.log(socket, Protocol_1.ConnectionRequest.messageType, data);
                _this.broadcastToPad(socket, data.padId, Protocol_1.ConnectionRequest.messageType, data);
            });
            socket.on(Protocol_1.ConnectionResponse.messageType, function (data) {
                _this.log(socket, Protocol_1.ConnectionResponse.messageType, data);
                _this.broadcastToPad(socket, data.padId, Protocol_1.ConnectionResponse.messageType, data);
            });
            socket.on('disconnect', function () {
                _this.log(socket, ' disconnected');
                _this.numSockets--;
            });
        });
    };
    Signaler.prototype.broadcastToPad = function (socket, padId, msgType, data) {
        if (!padId) {
            this.log(socket, 'Invalid padId: ', padId);
        }
        var roomId = padId.substr(0, 50); // don't let clients take up arbitrary amounts of persistent server memory
        socket.join(roomId); // use this opportunity to ensure this client is in the channel
        this.numPadsMemo = null; // blow away memoized stat (could have made a new room)
        // IDEA: maybe just forward to one (or a few) than everyone in the pad (if we know we can)
        socket.broadcast.to(roomId).emit(msgType, data);
        this.debug(socket, msgType, ' forwarded');
    };
    Signaler.prototype.getStatus = function () {
        var load = os.loadavg()[0];
        var totalMemory = os.totalmem();
        var freeMemory = os.freemem();
        if (this.numPadsMemo === null) {
            var numPads = 0;
            var rooms = this.io.sockets.adapter.rooms;
            for (var roomId in rooms) {
                if (rooms.hasOwnProperty(roomId))
                    numPads++;
            }
            this.numPadsMemo = numPads;
        }
        return {
            app: {
                numClients: this.numSockets,
                numPads: this.numPadsMemo
            },
            sys: {
                load: load,
                totalMemory: totalMemory,
                totalMemoryMB: asMB(totalMemory),
                freeMemory: freeMemory,
                freeMemoryMB: asMB(freeMemory),
                usedMemory: totalMemory - freeMemory,
                usedMemoryMB: asMB(totalMemory - freeMemory)
            }
        };
    };
    Signaler.prototype.debug = function (socket) {
        var msg = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            msg[_i - 1] = arguments[_i];
        }
        this.log.apply(this, [socket, 'sent DEBUG: '].concat(msg));
        if (!this.useDebug) {
            return;
        }
        socket.emit('DEBUG', msg ? msg.join('') : '');
    };
    Signaler.prototype.log = function (socket) {
        var msg = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            msg[_i - 1] = arguments[_i];
        }
        if (!this.useLog)
            return;
        console.log.apply(console, [socket.id].concat(msg)); // tslint:disable-line
    };
    return Signaler;
}());
function asMB(bytes) {
    if (bytes === null)
        return 'null';
    if (bytes === undefined)
        return 'undefined';
    return (bytes / (1024 * 1024)).toFixed(2) + 'MB';
}
function auth(username, password) {
    return function (req, res, next) {
        var user = basicAuth(req);
        if (!user || user.name !== username || user.pass !== password) {
            res.set('WWW-Authenticate', 'Basic realm=Authorization Required');
            return res.sendStatus(401);
        }
        next();
    };
}
;
if (require.main === module) {
    var port = Protocol_1.getSignalerPort();
    var host = Protocol_1.getSignalerHost();
    console.log("Attempting to start bp-signaler on \"" + host + "\" port " + port); // tslint:disable-line
    new Signaler().start(port, host);
}
//# sourceMappingURL=Signaler.js.map