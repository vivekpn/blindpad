"use strict";
var Random_1 = require('./Random');
exports.PRIMARY = {
    RED: { id: 'RED', val: '#F44336', darkText: false },
    PINK: { id: 'PINK', val: '#E91E63', darkText: false },
    PURPLE: { id: 'PURPLE', val: '#9C27B0', darkText: false },
    DEEP_PURPLE: { id: 'DEEP_PURPLE', val: '#673AB7', darkText: false },
    INDIGO: { id: 'INDIGO', val: '#3F51B5', darkText: false },
    BLUE: { id: 'BLUE', val: '#2196F3', darkText: false },
    LIGHT_BLUE: { id: 'LIGHT_BLUE', val: '#03A9F4', darkText: true },
    CYAN: { id: 'CYAN', val: '#00BCD4', darkText: true },
    TEAL: { id: 'TEAL', val: '#009688', darkText: false },
    GREEN: { id: 'GREEN', val: '#4CAF50', darkText: true },
    LIGHT_GREEN: { id: 'LIGHT_GREEN', val: '#8BC34A', darkText: true },
    LIME: { id: 'LIME', val: '#CDDC39', darkText: true },
    YELLOW: { id: 'YELLOW', val: '#FFEB3B', darkText: true },
    AMBER: { id: 'AMBER', val: '#FFC107', darkText: true },
    ORANGE: { id: 'ORANGE', val: '#FF9800', darkText: true },
    DEEP_ORANGE: { id: 'DEEP_ORANGE', val: '#FF5722', darkText: false },
    BROWN: { id: 'BROWN', val: '#795548', darkText: false },
    GREY: { id: 'GREY', val: '#9E9E9E', darkText: true },
    BLUE_GREY: { id: 'BLUE_GREY', val: '#607D8B', darkText: false }
};
exports.PRIMARY_COLOR = 'BLUE';
exports.COLOR_NAMES = Object.keys(exports.PRIMARY);
exports.SHUFFLED_COLOR_NAMES = Random_1.shuffle(exports.COLOR_NAMES);
exports.SHUFFLED_PRIMARY_FIRST = [exports.PRIMARY_COLOR].concat(exports.SHUFFLED_COLOR_NAMES.filter(function (c) { return c !== exports.PRIMARY_COLOR; }));
exports.NUM_COLORS = exports.COLOR_NAMES.length;
function getColor(idx, shuffled, primaryFirst) {
    if (shuffled === void 0) { shuffled = false; }
    if (primaryFirst === void 0) { primaryFirst = false; }
    var index = idx % exports.NUM_COLORS;
    var arr = shuffled ? (primaryFirst ? exports.SHUFFLED_PRIMARY_FIRST : exports.SHUFFLED_COLOR_NAMES) : exports.COLOR_NAMES;
    return exports.PRIMARY[arr[index]];
}
exports.getColor = getColor;
var generatedRules = new Map();
function getBackgroundClass(color) {
    var className = "color-" + color.id + "-background";
    if (generatedRules.has(className))
        return className;
    var rule = "." + className + " {\n        background: " + color.val + ";\n        color: " + (color.darkText ? 'black' : 'white') + " !important;\n    }";
    var sheet = getSheet();
    if (sheet)
        sheet.insertRule(rule, generatedRules.size); // silently fail if no sheet (because we're in a webworker or something)
    generatedRules.set(className, rule);
    return className;
}
exports.getBackgroundClass = getBackgroundClass;
var paletteSheet = null;
function getSheet() {
    if (paletteSheet !== null)
        return paletteSheet;
    var doc = self.document;
    if (!doc)
        return null;
    var styleElem = doc.createElement('style');
    styleElem.type = 'text/css';
    styleElem.className = 'palette';
    doc.getElementsByTagName('head')[0].appendChild(styleElem);
    paletteSheet = styleElem.sheet;
    return paletteSheet;
}
//# sourceMappingURL=Palette.js.map