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
require('rxjs/add/operator/throttleTime');
var VoiceAnalyser_1 = require('../util/VoiceAnalyser');
var MAX_UPDATE_FPS = 45;
var AudioMonitorComponent = (function () {
    function AudioMonitorComponent(zone) {
        var _this = this;
        this.zone = zone;
        this.onLevel = function (level) {
            level = Math.max(Math.min(level, 1.0), 0.01); // clamp (since the analyser promises us nothing)
            level = level * (2.0 - level); // ease out looks a litle nicer
            var pct = level * 100 + "%";
            var vert = _this.vertical !== undefined;
            _this.bar.nativeElement.style.width = vert ? '100%' : pct;
            _this.bar.nativeElement.style.height = vert ? pct : '100%';
        };
        this.onVoiceDetected = function (voiceIsActive) {
            _this.voiceActive = voiceIsActive;
        };
    }
    AudioMonitorComponent.prototype.ngOnDestroy = function () {
        this.analyser = null;
        this.ngOnChanges();
    };
    AudioMonitorComponent.prototype.ngOnChanges = function () {
        if (this.levelSub) {
            this.levelSub.unsubscribe();
            this.levelSub = null;
        }
        if (this.voiceDetectedSub) {
            this.voiceDetectedSub.unsubscribe();
            this.voiceDetectedSub = null;
        }
        if (this.analyser) {
            this.levelSub = this.analyser.getLevel().throttleTime(1000 / MAX_UPDATE_FPS).subscribe(this.onLevel);
            this.voiceDetectedSub = this.analyser.getVoiceDetected().subscribe(this.onVoiceDetected);
        }
    };
    __decorate([
        core_1.Input(), 
        __metadata('design:type', VoiceAnalyser_1.VoiceAnalyser)
    ], AudioMonitorComponent.prototype, "analyser", void 0);
    __decorate([
        core_1.Input(), 
        __metadata('design:type', Object)
    ], AudioMonitorComponent.prototype, "vertical", void 0);
    __decorate([
        core_1.ViewChild('bar'), 
        __metadata('design:type', core_1.ElementRef)
    ], AudioMonitorComponent.prototype, "bar", void 0);
    __decorate([
        core_1.HostBinding('class.voice-active'), 
        __metadata('design:type', Boolean)
    ], AudioMonitorComponent.prototype, "voiceActive", void 0);
    AudioMonitorComponent = __decorate([
        core_1.Component({
            selector: 'audio-monitor',
            template: '<monitor-bar #bar></monitor-bar>',
            styleUrls: ['audio-monitor.component.scss']
        }), 
        __metadata('design:paramtypes', [core_1.NgZone])
    ], AudioMonitorComponent);
    return AudioMonitorComponent;
}());
exports.AudioMonitorComponent = AudioMonitorComponent;
//# sourceMappingURL=audio-monitor.component.js.map