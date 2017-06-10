"use strict";
var Observable_1 = require('rxjs/Observable');
/**
 * Returns an observable that triggers on every animation frame (via requestAnimationFrame).
 * The value that comes through the observable is the time(ms) since the previous frame
 * (or the time since the subscribe call for the first frame)
 */
function animationFrames() {
    return getAsyncObservable(window.requestAnimationFrame || window.msRequestAnimationFrame, window.cancelAnimationFrame || window.msCancelRequestAnimationFrame);
}
exports.animationFrames = animationFrames;
/**
 * Returns an observable that triggers at roughly the given frequency (in ms) (via setTimeout).
 * The value that comes through the observable is the time(ms) since the previous invocation
 * (or the time since the subscribe call for the first invocation)
 */
function interval(timeout) {
    return getAsyncObservable(function (handler) { return window.setTimeout(handler, timeout); }, window.clearTimeout);
}
exports.interval = interval;
/**
 * Adapted from: http://stackoverflow.com/questions/27882764/rxjs-whats-the-difference-among-observer-isstopped-observer-observer-isstopp
 */
function getAsyncObservable(scheduleFn, cancelFn) {
    return Observable_1.Observable.create(function (observer) {
        var startTime = Date.now();
        var requestId;
        var callback = function (currentTime) {
            // If we have not been disposed, then request the next frame
            if (requestId !== undefined) {
                requestId = scheduleFn(callback);
            }
            observer.next(Math.max(0, currentTime - startTime));
            startTime = currentTime;
        };
        requestId = scheduleFn(callback);
        return function () {
            if (requestId !== undefined) {
                var r = requestId;
                requestId = undefined;
                cancelFn(r);
            }
        };
    });
}
//# sourceMappingURL=Observables.js.map