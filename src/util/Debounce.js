"use strict";
function debounce(func, wait) {
    var timeoutId = null;
    var later = function () {
        timeoutId = null;
        func();
    };
    return function () {
        if (timeoutId !== null)
            clearTimeout(timeoutId);
        timeoutId = self.setTimeout(later, wait);
    };
}
exports.debounce = debounce;
//# sourceMappingURL=Debounce.js.map