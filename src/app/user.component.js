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
var Palette_1 = require('../util/Palette');
var UserModel_1 = require('../services/UserModel');
require('../assets/volume_up.png');
require('../assets/volume_down.png');
require('../assets/volume_muted.png');
require('../assets/mic_up.png');
require('../assets/mic_down.png');
require('../assets/mic_muted.png');
var UserComponent = (function () {
    function UserComponent() {
    }
    UserComponent.prototype.ngOnDestroy = function () {
        this.model = null;
        this.ngOnChanges();
    };
    UserComponent.prototype.ngOnChanges = function () {
        var _this = this;
        if (this.streamSub) {
            this.streamSub.unsubscribe();
            this.streamSub = null;
        }
        if (this.muteSub) {
            this.muteSub.unsubscribe();
            this.muteSub = null;
        }
        if (this.voiceDetectedSub) {
            this.voiceDetectedSub.unsubscribe();
            this.voiceDetectedSub = null;
        }
        if (this.nameSub) {
            this.nameSub.unsubscribe();
            this.nameSub = null;
        }
        if (this.colorSub) {
            this.colorSub.unsubscribe();
            this.colorSub = null;
        }
        this.voiceIsActive = false;
        this.initials = '';
        this.name = '';
        this.color = Palette_1.PRIMARY.RED;
        this.connected = false;
        if (!this.model)
            return;
        this.colorSub = this.model.getColor().subscribe(function (color) { return _this.color = color; });
        this.nameSub = this.model.getName().subscribe(function (name) {
            if (_this.model.isLocalUser()) {
                _this.name = name ? name : 'Local';
                _this.initials = 'YOU';
                _this.connected = true;
            }
            else if (name === null) {
                _this.name = '';
                _this.initials = '';
                _this.connected = false;
            }
            else {
                _this.name = name !== null ? name : '';
                _this.initials = name !== null ? getInitials(_this.name) : '';
                _this.connected = true;
            }
        });
        if (this.model.isRemoteUser()) {
            this.streamSub = this.model.getAudioStream().subscribe(function (stream) {
                _this.audioElem.nativeElement.srcObject = stream; // somehow srcObject not in typings for HTMLAudioElement
            });
            this.muteSub = this.model.getIsMuted().subscribe(function (muted) {
                _this.audioElem.nativeElement.muted = muted;
            });
        }
        this.voiceDetectedSub = this.model.getVoiceAnalyser().getVoiceDetected().subscribe(function (detected) {
            _this.voiceIsActive = detected;
            // if (this.model.isRemoteUser()) {
            //     // mute remote users when they're not speaking to cut down on echo
            //     // (this.audioElem.nativeElement as HTMLAudioElement).volume = detected ? 1.0 : 0.0;
            // }
        });
    };
    UserComponent.prototype.getTitle = function () {
        if (!this.connected)
            return 'Connecting...';
        if (this.model.isUnavailable())
            return 'Currently unavailable';
        return this.name;
    };
    __decorate([
        core_1.Input(), 
        __metadata('design:type', UserModel_1.UserModel)
    ], UserComponent.prototype, "model", void 0);
    __decorate([
        core_1.ViewChild('audio'), 
        __metadata('design:type', core_1.ElementRef)
    ], UserComponent.prototype, "audioElem", void 0);
    UserComponent = __decorate([
        core_1.Component({
            selector: 'user',
            templateUrl: 'user.component.html',
            styleUrls: ['user.component.scss']
        }), 
        __metadata('design:paramtypes', [])
    ], UserComponent);
    return UserComponent;
}());
exports.UserComponent = UserComponent;
function getInitials(str) {
    return str
        .replace(/([A-Z])/g, ' $1') // insert a space before all caps
        .replace(/^./, function (s) { return s.toUpperCase(); }) // uppercase the first character
        .split(' ') // break apart by space
        .map(function (s) { return s.charAt(0); }) // get first letter
        .join('') // stitch back together
        .substring(0, 2); // at most 2
}
//# sourceMappingURL=user.component.js.map