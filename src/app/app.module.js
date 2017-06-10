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
// our bootstrap html, DON'T PUT OTHER HTML HERE (other templates should get inlined with a webpack plugin)
require('file?name=[name].[ext]!./index.html');
// polyfill for web animations API
require('file?name=[name].[ext]!../../node_modules/web-animations-js/web-animations.min.js');
// shims + angular dependencies to load before the main bundle
require('file?name=[name].[ext]!../../node_modules/reflect-metadata/Reflect.js');
require('file?name=[name].[ext]!../../node_modules/zone.js/dist/zone.js');
require('file?name=[name].[ext]!../../node_modules/core-js/client/shim.min.js');
// favicons
require('../assets/favicon/favicon-32x32.png');
require('../assets/favicon/favicon-96x96.png');
require('../assets/favicon/favicon-16x16.png');
require('../assets/favicon/favicon.ico');
require('../assets/bp_logo.png');
require('../scss/global.scss');
var core_1 = require('@angular/core');
var platform_browser_1 = require('@angular/platform-browser');
var router_1 = require('@angular/router');
var platform_browser_2 = require('@angular/platform-browser');
var blindpad_service_1 = require('../services/blindpad.service');
var media_service_1 = require('../services/media.service');
var app_component_1 = require('./app.component');
var pad_component_1 = require('./pad.component');
var audio_monitor_component_1 = require('./audio-monitor.component');
var editor_component_1 = require('./editor.component');
var user_component_1 = require('./user.component');
var routes = [
    { path: 'pad/:id', component: pad_component_1.PadComponent },
    { path: 'about', component: pad_component_1.PadComponent },
    { path: 'support', component: pad_component_1.PadComponent },
    { path: '', pathMatch: 'prefix', component: pad_component_1.PadComponent }
];
var AppModule = (function () {
    function AppModule() {
    }
    AppModule = __decorate([
        core_1.NgModule({
            imports: [
                platform_browser_1.BrowserModule,
                router_1.RouterModule.forRoot(routes)
            ],
            declarations: [
                app_component_1.AppComponent,
                pad_component_1.PadComponent,
                audio_monitor_component_1.AudioMonitorComponent,
                editor_component_1.EditorComponent,
                user_component_1.UserComponent
            ],
            providers: [
                platform_browser_2.Title,
                blindpad_service_1.BlindpadService,
                media_service_1.MediaService
            ],
            schemas: [core_1.CUSTOM_ELEMENTS_SCHEMA],
            bootstrap: [app_component_1.AppComponent]
        }), 
        __metadata('design:paramtypes', [])
    ], AppModule);
    return AppModule;
}());
exports.AppModule = AppModule;
//# sourceMappingURL=app.module.js.map