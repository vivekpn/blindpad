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
var platform_browser_1 = require('@angular/platform-browser');
var BehaviorSubject_1 = require('rxjs/BehaviorSubject');
var media_service_1 = require('./media.service');
var PadModel_1 = require('./PadModel');
var BlindpadService = (function () {
    function BlindpadService(mediaService, titleService, zone) {
        var _this = this;
        this.mediaService = mediaService;
        this.titleService = titleService;
        this.zone = zone;
        this.onBeforeUnload = function () {
            if (_this.pad.value)
                _this.pad.value.close();
        };
        this.pad = new BehaviorSubject_1.BehaviorSubject(null);
        window.addEventListener('beforeunload', this.onBeforeUnload);
        this.pad.subscribe(function (pad) { return _this.titleService.setTitle(pad ? "blindpad - " + pad.getPadId() : 'blindpad'); });
    }
    BlindpadService.prototype.getPad = function () { return this.pad; };
    BlindpadService.prototype.setPadId = function (padId) {
        if (this.pad.value && this.pad.value.getPadId() === padId)
            return;
        if (this.pad.value)
            this.pad.value.close();
        this.pad.next(padId ? new PadModel_1.PadModel(padId, this) : null);
    };
    BlindpadService.prototype.getPadId = function () {
        return this.pad.value ? this.pad.value.getPadId() : null;
    };
    BlindpadService.prototype.startPad = function () {
        if (this.pad.value) {
            this.pad.value.start();
        }
    };
    BlindpadService.prototype.isPadStarted = function () {
        return this.pad.value && this.pad.value.isStarted();
    };
    BlindpadService = __decorate([
        core_1.Injectable(), 
        __metadata('design:paramtypes', [media_service_1.MediaService, platform_browser_1.Title, core_1.NgZone])
    ], BlindpadService);
    return BlindpadService;
}());
exports.BlindpadService = BlindpadService;
//# sourceMappingURL=blindpad.service.js.map