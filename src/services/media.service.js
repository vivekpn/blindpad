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
require('webrtc-adapter');
var core_1 = require('@angular/core');
var BehaviorSubject_1 = require('rxjs/BehaviorSubject');
require('rxjs/add/operator/combineLatest');
var PitchDetector_1 = require('../util/PitchDetector');
var PitchShifter_1 = require('../util/PitchShifter');
var VoiceAnalyser_1 = require('../util/VoiceAnalyser');
var DEFAULT_REFERENCE_PITCH = 157.5;
var DEBUG_CALIBRATION = null; // 115;
var SAVED_CALIBRATION_KEY = 'measuredPitch';
var MediaService = (function () {
    function MediaService(zone) {
        var _this = this;
        this.zone = zone;
        this.calibrationAttempts = 0;
        this.storage = window.sessionStorage; // could also be localstorage
        this.audioContext = new (window['AudioContext'] || window['webkitAudioContext'])();
        this.initialized = false;
        this.optOut = false;
        this.userMedia = null;
        this.localStream = new BehaviorSubject_1.BehaviorSubject(null);
        this.voiceAnalyser = new VoiceAnalyser_1.VoiceAnalyser(this.audioContext, zone);
        this.shifter = new PitchShifter_1.PitchShifter(this.audioContext);
        this.microphoneNode = null;
        this.destNode = null;
        this.isMuted = new BehaviorSubject_1.BehaviorSubject(false);
        this.detector = new PitchDetector_1.PitchDetector(this.audioContext);
        this.measuredPitch = new BehaviorSubject_1.BehaviorSubject(DEBUG_CALIBRATION || this.getSavedCalibration());
        this.measuredPitch.subscribe(function (pitch) {
            console.log('Calibrated: ', pitch); // tslint:disable-line
            if (pitch) {
                _this.storage.setItem(SAVED_CALIBRATION_KEY, JSON.stringify(pitch));
            }
            else {
                _this.storage.removeItem(SAVED_CALIBRATION_KEY);
            }
            _this.shifter.setPitchScale(pitch > 0 ? DEFAULT_REFERENCE_PITCH / pitch : null);
        });
    }
    MediaService.prototype.initializeLocal = function () {
        var _this = this;
        if (this.initialized || this.isOptOut())
            return;
        this.initialized = true;
        // if (1 === 1) return; // TODO delete this
        navigator.mediaDevices.getUserMedia({ audio: true, video: false })
            .then(function (microphone) {
            var ctx = _this.audioContext;
            _this.userMedia = microphone;
            if (_this.isOptOut()) {
                _this.ensureUserMediaClosed();
                return;
            }
            // two paths through the local audio graph
            // microphone => shifter => deststream
            // microhpone => analyser
            _this.microphoneNode = ctx.createMediaStreamSource(microphone);
            _this.destNode = ctx.createMediaStreamDestination();
            _this.localStream.next(_this.destNode.stream);
            _this.voiceAnalyser.start(_this.microphoneNode);
            // we should mute the local user when either we're explicitly asked to mute // (turned off) or nobody's speaking (to save CPU)
            var isConnected = false; // need this because disconnecting an unconnected node throws an error and we cant introspect in the API
            _this.isMuted.combineLatest(_this.voiceAnalyser.getVoiceDetected(), function (muted, detected) { return !muted; }) // && detected) (disconnecting when voice not detected is too laggy: maybe use a gain node if it ends up noisy in practice?)
                .subscribe(function (isEnabled) {
                if (isEnabled === isConnected)
                    return;
                var shifterNode = _this.shifter.getNode();
                // need to disconnect both ends of a script processor to get it to stop running
                if (isEnabled) {
                    _this.microphoneNode.connect(shifterNode);
                    shifterNode.connect(_this.destNode);
                }
                else {
                    _this.microphoneNode.disconnect(shifterNode);
                    shifterNode.disconnect(_this.destNode);
                }
                isConnected = isEnabled;
            });
        }, function (error) {
            _this.localStream.next(null);
            _this.localStream.error(error);
            _this.optOut = true;
        });
    };
    MediaService.prototype.getLocalStream = function () { return this.localStream; };
    MediaService.prototype.getAudioContext = function () { return this.audioContext; };
    MediaService.prototype.getLocalAnalyser = function () { return this.voiceAnalyser; };
    MediaService.prototype.setCalibrating = function (calibrating) {
        var _this = this;
        this.localStream.filter(function (stream) { return !!stream; }).take(1).subscribe(function () {
            if (calibrating === _this.detector.isRunning())
                return; // in case of multiple clicks while waiting for initialization
            if (calibrating) {
                _this.measuredPitch.next(null);
                _this.calibrationAttempts++;
                _this.calibrationQuality = null;
                _this.detector.start(_this.microphoneNode);
            }
            else {
                _this.detector.stop();
                _this.calibrationQuality = _this.detector.getEstimateQuality();
                _this.measuredPitch.next(_this.detector.hasGoodEstimate() ? _this.detector.getEstimate() : null);
            }
        });
    };
    MediaService.prototype.isCalibrating = function () { return this.detector.isRunning(); };
    MediaService.prototype.isCalibrated = function () { return this.getCalibration().value !== null; };
    MediaService.prototype.needsCalibration = function () { return !this.isCalibrated() && !this.isOptOut(); };
    MediaService.prototype.getCalibrationAttempts = function () { return this.calibrationAttempts; };
    MediaService.prototype.getCalibration = function () { return this.measuredPitch; };
    MediaService.prototype.getCalibrationQuality = function () { return this.calibrationQuality; };
    MediaService.prototype.clearCalibration = function () {
        if (!this.isCalibrated())
            return;
        this.calibrationAttempts = 0;
        this.measuredPitch.next(null);
    };
    MediaService.prototype.setOptOut = function () {
        this.optOut = true;
        this.ensureUserMediaClosed();
    };
    MediaService.prototype.isOptOut = function () { return this.optOut; };
    MediaService.prototype.getIsMuted = function () { return this.isMuted; };
    MediaService.prototype.setIsMuted = function (muted) { this.isMuted.next(!!muted); };
    MediaService.prototype.getPhrases = function () {
        return [
            'They ate eight reindeer steaks.',
            'The gauge shows a great change. ',
            'Where is their snake? ',
            'It’s over there in the cage. ',
            'Harry is crazy about the taste of gravy. ',
            'In April the mayor will raise the tax rate. ',
            'I hear that those people are very crazy. ',
            'The scenery here is beyond belief. ' // ,
        ];
    };
    MediaService.prototype.ensureUserMediaClosed = function () {
        if (!this.userMedia)
            return;
        if (this.userMedia.stop)
            this.userMedia.stop();
        this.userMedia.getVideoTracks().forEach(function (t) { if (t.stop)
            t.stop(); });
        this.userMedia.getAudioTracks().forEach(function (t) { if (t.stop)
            t.stop(); });
        this.userMedia = null;
    };
    MediaService.prototype.getSavedCalibration = function () {
        var saved = this.storage.getItem(SAVED_CALIBRATION_KEY);
        return saved ? JSON.parse(saved) : null;
    };
    MediaService = __decorate([
        core_1.Injectable(), 
        __metadata('design:paramtypes', [core_1.NgZone])
    ], MediaService);
    return MediaService;
}());
exports.MediaService = MediaService;
//# sourceMappingURL=media.service.js.map