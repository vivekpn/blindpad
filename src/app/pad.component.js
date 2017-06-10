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
var router_1 = require('@angular/router');
var bowser = require('bowser');
var blindpad_service_1 = require('../services/blindpad.service');
var media_service_1 = require('../services/media.service');
var Names_1 = require('../util/Names');
var CodeMirror_1 = require('../util/CodeMirror');
var Animations_1 = require('../util/Animations');
var PadView;
(function (PadView) {
    PadView[PadView["Welcome"] = 0] = "Welcome";
    PadView[PadView["AudioSetup"] = 1] = "AudioSetup";
    PadView[PadView["Editor"] = 2] = "Editor";
    PadView[PadView["About"] = 3] = "About";
})(PadView || (PadView = {}));
var PadComponent = (function () {
    function PadComponent(router, route, blindpadService, media) {
        this.router = router;
        this.route = route;
        this.blindpadService = blindpadService;
        this.media = media;
        this.PadView = PadView;
        this.visibleModeChoices = null;
    }
    PadComponent.prototype.ngOnInit = function () {
        var _this = this;
        this.routeSub = this.route.params.subscribe(function (params) {
            var url = _this.route.snapshot.url[0];
            var path = url ? url.path : '';
            var urlPadId = params['id'];
            _this.randomPadId = Names_1.getDescribedNoun('Pad', 10000);
            // if we're being asked to load a different pad than we're currently showing close the one we're showing
            if (_this.blindpadService.getPadId() && _this.blindpadService.getPadId() !== urlPadId) {
                _this.blindpadService.setPadId(null);
            }
            if (path === 'pad' && urlPadId) {
                _this.blindpadService.setPadId(urlPadId);
                if (!_this.media.needsCalibration()) {
                    _this.media.initializeLocal();
                }
                // if we've already turned this pad on (presumably before navigating here) don't bother with the welcome screen
                _this.view = _this.blindpadService.isPadStarted() ? PadView.Editor : PadView.Welcome;
            }
            else if (path === 'about') {
                _this.view = PadView.About;
            }
            else {
                _this.view = PadView.Welcome;
            }
        });
    };
    PadComponent.prototype.ngOnDestroy = function () { this.routeSub.unsubscribe(); };
    PadComponent.prototype.hasWebRTC = function () {
        return hasMethod(window.RTCPeerConnection || window['webkitRTCPeerConnection'], 'createDataChannel')
            && hasMethod(window.navigator, 'getUserMedia');
    };
    PadComponent.prototype.hasWebAudio = function () {
        return hasMethod(window.AudioContext || window['webkitAudioContext'], 'createMediaStreamDestination');
    };
    PadComponent.prototype.browserIsSupported = function () { return this.hasWebAudio() && this.hasWebRTC(); };
    PadComponent.prototype.getView = function () { return this.view; };
    PadComponent.prototype.getPad = function () { return this.blindpadService.getPad().value; };
    PadComponent.prototype.hasPad = function () { return !!this.getPad(); };
    /* navigation */
    PadComponent.prototype.getPadMode = function () {
        var pad = this.getPad();
        if (!pad)
            return null;
        return CodeMirror_1.getModeForMime(pad.getMimeType().value);
    };
    PadComponent.prototype.onModeButtonClick = function () {
        if (this.visibleModeChoices) {
            this.visibleModeChoices = null;
        }
        else {
            this.visibleModeChoices = CodeMirror_1.MODES;
        }
    };
    PadComponent.prototype.onModeChoice = function (choice) {
        if (!choice || !this.hasPad()) {
            this.visibleModeChoices = null;
        }
        else if (choice.children && choice.children.length > 0) {
            this.visibleModeChoices = choice.children;
        }
        else {
            this.getPad().setMimeType(choice.mime);
            this.visibleModeChoices = null;
        }
    };
    PadComponent.prototype.onDocumentClick = function (event) {
        if (this.visibleModeChoices === null)
            return;
        var target = event.target;
        var isModeChoice = target.tagName.toLowerCase() === 'mode-choice';
        var isModeButton = target.classList.contains('mode-button');
        if (isModeButton || isModeChoice)
            return;
        this.visibleModeChoices = null;
    };
    /* audio setup */
    PadComponent.prototype.isChromeOnMac = function () { return !!bowser.chrome && !!bowser['mac']; };
    PadComponent.prototype.optOutOfVoice = function () {
        this.media.setOptOut();
        this.view = PadView.Welcome;
    };
    PadComponent.prototype.startAudioSetup = function () {
        var _this = this;
        var initFailure = this.media.getLocalStream().subscribe(null, function (error) {
            _this.view = PadView.Welcome;
            initFailure.unsubscribe();
            initFailure = null;
            if (success)
                success.unsubscribe();
        });
        // switch the view back once we've calibrated
        var success = this.media.getCalibration().filter(function (pitch) { return pitch !== null; }).take(1).subscribe(function (pitch) {
            if (_this.view === PadView.AudioSetup) {
                _this.view = PadView.Welcome;
                if (initFailure) {
                    initFailure.unsubscribe();
                }
            }
        });
        this.media.initializeLocal();
        this.view = PadView.AudioSetup;
    };
    PadComponent.prototype.isConnected = function () { return this.hasPad() && this.getPad().isSignalerConnected(); };
    PadComponent.prototype.getUsers = function () {
        if (!this.hasPad())
            return [];
        return Array.from(this.getPad().getUsers().values());
    };
    /* joining a pad */
    PadComponent.prototype.getJoinId = function () { return this.hasPad() ? this.getPad().getPadId() : this.randomPadId; };
    PadComponent.prototype.joinPad = function () {
        if (this.hasPad()) {
            this.blindpadService.startPad();
            this.view = PadView.Editor;
        }
        else {
            this.blindpadService.setPadId(this.randomPadId);
            this.blindpadService.startPad();
            this.router.navigate(['/pad', this.randomPadId]);
        }
    };
    PadComponent = __decorate([
        core_1.Component({
            selector: 'pad',
            templateUrl: 'pad.component.html',
            styleUrls: ['pad.component.scss'],
            animations: [Animations_1.fadeInOut],
            host: {
                '(document:click)': 'onDocumentClick($event)'
            }
        }), 
        __metadata('design:paramtypes', [router_1.Router, router_1.ActivatedRoute, blindpad_service_1.BlindpadService, media_service_1.MediaService])
    ], PadComponent);
    return PadComponent;
}());
exports.PadComponent = PadComponent;
function hasMethod(type, methodName) {
    return type && (type[methodName] || (type['prototype'] && type['prototype'][methodName]));
}
//# sourceMappingURL=pad.component.js.map