"use strict";
/**
 * Return a shuffled version of the given array
 */
function shuffle(arr) {
    var result = Array.from(arr);
    for (var i = 0, l = result.length; i < l; i++) {
        var rand = randomInt(i, l);
        var t = result[rand];
        result[rand] = result[i];
        result[i] = t;
    }
    return result;
}
exports.shuffle = shuffle;
/**
 * Get a random integer in the range [lo, hi)
 */
function randomInt(lo, hi) {
    return Math.floor(lo + Math.random() * (hi - lo));
}
exports.randomInt = randomInt;
/**
 * A basic PRNG that can be seeded (unlike the builtin js one)
 *
 * A simplified typescripty version of
 * https://github.com/DomenicoDeFelice/jsrand
 */
var SeededRandom = (function () {
    function SeededRandom(seed) {
        var _this = this;
        if (seed === void 0) { seed = Math.random(); }
        /**
         * Returns a pseudo-random number between 0 inclusive and 1 exclusive.
         * Algorithm used is MWC (multiply-with-carry) by George Marsaglia.
         * Implementation based on:
         * http://en.wikipedia.org/wiki/Random_number_generation#Computational_methods
         * http://stackoverflow.com/questions/521295/javascript-random-seeds#19301306
         */
        this.random = function () {
            var mz = _this.mz;
            var mw = _this.mw;
            // The 16 least significant bits are multiplied by a constant
            // and then added to the 16 most significant bits. 32 bits result.
            mz = ((mz & 0xffff) * 36969 + (mz >> 16)) & 0xffffffff; // tslint:disable-line
            mw = ((mw & 0xffff) * 18000 + (mw >> 16)) & 0xffffffff; // tslint:disable-line
            _this.mz = mz;
            _this.mw = mw;
            var x = (((mz << 16) + mw) & 0xffffffff) / 0x100000000; // tslint:disable-line
            return 0.5 + x;
        };
        // Uses only one seed (mw), mz is fixed.
        // Must not be zero, nor 0x9068ffff.
        if (seed === 0 || seed === 0x9068ffff) {
            seed++;
        }
        this.mz = 123456789;
        this.mw = seed;
    }
    return SeededRandom;
}());
exports.SeededRandom = SeededRandom;
//# sourceMappingURL=Random.js.map