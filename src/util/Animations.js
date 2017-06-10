"use strict";
var core_1 = require('@angular/core');
exports.fadeInOut = core_1.trigger('fadeInOut', [
    core_1.state('*', core_1.style({
        opacity: 1.0,
        height: '*'
    })),
    core_1.transition('void => *', [
        core_1.style({
            opacity: 0.0,
            height: 0
        }),
        core_1.animate('300ms ease-in')
    ]),
    core_1.transition('* => void', [
        core_1.animate('300ms ease-out', core_1.style({
            opacity: 0.0,
            height: 0
        }))
    ])
]);
//# sourceMappingURL=Animations.js.map