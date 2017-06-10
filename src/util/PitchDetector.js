"use strict";
var detectPitch = require('detect-pitch');
var Observables_1 = require('../util/Observables');
/**
 * The volume underneath which we'll consider the user not to be talking
 */
var VOL_CUTOFF = 150;
var DESIRED_MEASUREMENTS = 60;
var SIGNAL_BUFFER_SIZE = 4096;
/**
 * Autocorrelation is supposed to take a while to become accurate so let's throw away our first few measurements
 */
var INITIAL_DISCARD_NUM = 20;
/**
 * Between 0 and 1 which determines the cutoff for reporting a successful detection.
 * Higher values indicate stricter cutoff.
 */
var AUTOCORRELATION_THRESHOLD = 0.4;
var HUMAN_PITCH_MIN = 70.0;
var HUMAN_PITCH_MAX = 360.0;
/**
 * Notes adapted from reading random papers:
 *
 * - Human pitch lies in the interval 80-350 Hz.
 * - The pitch for men is normally around 150 Hz, for women around 250 Hz and children even higher.
 *
 * A typical adult male will have a fundamental frequency of from 85 to 155 Hz, and that of a typical
 * adult female from 165 to 255 Hz. Children and babies have even higher fundamental frequencies.
 * Infants show a range of 250 to 650 Hz, and in some cases go over 1000 Hz.  A 10-year-old boy
 * or girl might have a fundamental frequency around 400 Hz. When we speak, it is natural for our
 * fundamental frequency to vary within a range of frequencies. This is heard as the intonation
 * pattern or melody of natural speech.  When we sing a song, we are controlling the fundamental
 * frequency of our voice according to the melody of that song.  Since a person's voice typically
 * varies over a range of fundamental frequencies, it is more accurate to speak of a person having
 * a range of fundamental frequencies, rather than one specific fundamental frequency.
 * Nevertheless, a person's relaxed voice usually can be characterized by a "natural" fundamental
 * frequency that is comfortable for that person.
 */
var PitchDetector = (function () {
    function PitchDetector(context) {
        this.context = context;
    }
    PitchDetector.prototype.start = function (source) {
        var _this = this;
        if (this.isRunning())
            return;
        this.source = source;
        this.analyser = this.context.createAnalyser();
        this.signalBuffer = new Float32Array(SIGNAL_BUFFER_SIZE);
        this.freqBuffer = new Uint8Array(this.analyser.frequencyBinCount);
        this.source.connect(this.analyser);
        this.estimate = undefined;
        this.numMeasurements = 0;
        this.numGoodMeasurements = 0;
        this.weightedMeasurementsSum = 0;
        this.weightsSum = 0;
        this.measurements = [];
        this.pitches = [];
        this.runningSub = Observables_1.animationFrames().subscribe(function (animTime) {
            _this.numMeasurements++;
            _this.analyser.getFloatTimeDomainData(_this.signalBuffer);
            _this.analyser.getByteFrequencyData(_this.freqBuffer);
            var period = detectPitch(_this.signalBuffer, AUTOCORRELATION_THRESHOLD);
            var fftSize = _this.analyser.fftSize;
            var sampleRate = _this.context.sampleRate;
            var freqBuf = _this.freqBuffer;
            var nFreqBuckets = freqBuf.length;
            var bucketWidth = sampleRate / fftSize;
            var sum = 0.0;
            var humanRangeSum = 0.0;
            var nHumanBuckets = 0;
            for (var i = 0; i < nFreqBuckets; i++) {
                var freq = i * bucketWidth;
                var val = freqBuf[i] / 255.0 * bucketWidth;
                if (freq >= HUMAN_PITCH_MIN && freq <= HUMAN_PITCH_MAX) {
                    nHumanBuckets++;
                    humanRangeSum += val;
                }
                sum += val;
            }
            var pitch = period ? sampleRate / period : null;
            var vol = sum;
            var humanVol = humanRangeSum;
            if (pitch === null)
                return; // none detected
            if (_this.numMeasurements < INITIAL_DISCARD_NUM)
                return;
            if (vol < VOL_CUTOFF)
                return; // too quiet
            if (pitch < HUMAN_PITCH_MIN || pitch > HUMAN_PITCH_MAX)
                return;
            _this.numGoodMeasurements++;
            var weight = humanVol;
            _this.weightedMeasurementsSum += weight * pitch;
            _this.weightsSum += weight;
            _this.pitches.push(pitch);
            _this.estimate = undefined;
            _this.measurements.push({ pitch: pitch, vol: vol, hVol: humanVol });
            // TODO: take first k then disregard multiples after that?
        });
    };
    PitchDetector.prototype.stop = function () {
        if (!this.isRunning())
            return;
        // console.log('\npitch:\n' + this.measurements.map(p => p.pitch).join('\n'));
        // console.log('\nvol:\n' + this.measurements.map(p => p.vol).join('\n'));
        // console.log('\nhVol:\n' + this.measurements.map(p => p.hVol).join('\n'));
        this.runningSub.unsubscribe();
        this.runningSub = null;
        this.source.disconnect(this.analyser);
        this.source = null;
        this.analyser = null;
        this.signalBuffer = null;
        this.freqBuffer = null;
    };
    PitchDetector.prototype.isRunning = function () {
        return !!this.runningSub;
    };
    PitchDetector.prototype.getEstimate = function () {
        // return this.weightedMeasurementsSum / this.weightsSum;
        if (this.estimate !== undefined)
            return this.estimate;
        this.estimate = median(this.pitches);
        return this.estimate;
    };
    PitchDetector.prototype.hasGoodEstimate = function () {
        return this.getEstimateQuality() >= 1.0;
    };
    PitchDetector.prototype.getEstimateQuality = function () {
        return Math.min(this.numGoodMeasurements / DESIRED_MEASUREMENTS, 1.0);
    };
    return PitchDetector;
}());
exports.PitchDetector = PitchDetector;
/**
 * Gets the median (has the side effect of sorting the array)
 */
function median(values) {
    if (values.length === 0)
        return NaN;
    values.sort(function (a, b) { return a - b; });
    var half = Math.floor(values.length / 2);
    return values.length % 2 ? values[half] : ((values[half - 1] + values[half]) / 2.0);
}
//# sourceMappingURL=PitchDetector.js.map