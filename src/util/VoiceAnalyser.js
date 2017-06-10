"use strict";
var BehaviorSubject_1 = require('rxjs/BehaviorSubject');
var AnalyserOptions = (function () {
    function AnalyserOptions() {
        /** How wide is our analyser? */
        this.fftSize = 512;
        this.bufferLen = 512;
        /** Smoothing for voice detection (needs to be high) */
        this.vadSmoothing = 0.99;
        /** Smoothing for visualization (should be fairly low) */
        this.levelSmoothing = 0.2;
        /** The initial offset */
        this.energyOffset = 1e-8;
        /** Signal must be twice the offset */
        this.energyThresholdRatioPos = 2;
        /** Signal must be half the offset */
        this.energyThresholdRatioNeg = 0.5;
        /** Size of integration change compared to the signal per second. */
        this.energyIntegration = 1;
        /** 0 -> 200 is 0, 200 -> 2k is 1 */
        this.filter = [
            { f: 200, v: 0 },
            { f: 2000, v: 1 } // 200 -> 2k is 1
        ];
    }
    return AnalyserOptions;
}());
exports.AnalyserOptions = AnalyserOptions;
/**
 * A simple voice activity analyser, heavily based on https://github.com/kdavis-mozilla/vad.js
 */
var VoiceAnalyser = (function () {
    /**
     * The runner parameter is an object whose run method we'll hand our rxjs updates to to invoke (kind of like an rx scheduler).
     * We need this because they're being fired inside of a script processor node which is outside angular 2's zone.
     */
    function VoiceAnalyser(context, runner, options) {
        var _this = this;
        if (options === void 0) { options = new AnalyserOptions(); }
        this.context = context;
        this.runner = runner;
        this.options = options;
        this.update = function () {
            _this.vadAnalyser.getFloatFrequencyData(_this.floatFrequencyData);
            _this.levelAnalyser.getByteFrequencyData(_this.byteFrequencyData);
            _this.updateEnergyAndLevel();
            _this.checkForVoice();
        };
        // Calculate time relationships
        this.hertzPerBin = this.context.sampleRate / this.options.fftSize;
        this.iterationFrequency = this.context.sampleRate / this.options.bufferLen;
        this.iterationPeriod = 1.0 / this.iterationFrequency;
        this.setFilter(this.options.filter);
        this.energy = 0;
        this.level = new BehaviorSubject_1.BehaviorSubject(0);
        this.vadState = new BehaviorSubject_1.BehaviorSubject(false);
        // scriptprocessor doesnt work if its not connected to an output in chrome so make a dead node
        this.deadNode = this.context.createGain();
        this.deadNode.gain.value = 0;
        if (!this.runner) {
            this.runner = { run: function (fn) { return fn(); } };
        }
    }
    VoiceAnalyser.prototype.start = function (source) {
        if (this.isRunning())
            return;
        this.source = source;
        // setup tracking stats
        this.energy = 0;
        this.energyOffset = this.options.energyOffset;
        this.energyThresholdPos = this.energyOffset * this.options.energyThresholdRatioPos;
        this.energyThresholdNeg = this.energyOffset * this.options.energyThresholdRatioNeg;
        this.voiceTrend = 0;
        this.voiceTrendMax = 10;
        this.voiceTrendMin = -10;
        this.voiceTrendStart = 5;
        this.voiceTrendEnd = -5;
        // setup level analysis
        this.levelAnalyser = this.context.createAnalyser();
        this.levelAnalyser.smoothingTimeConstant = this.options.levelSmoothing;
        this.levelAnalyser.fftSize = this.options.fftSize;
        this.computedLevel = 0;
        this.level.next(0);
        // setup voice activity analysis
        this.vadAnalyser = this.context.createAnalyser();
        this.vadAnalyser.smoothingTimeConstant = this.options.vadSmoothing;
        this.vadAnalyser.fftSize = this.options.fftSize;
        this.pollerNode = this.context.createScriptProcessor(this.options.bufferLen, 1, 1);
        this.floatFrequencyData = new Float32Array(this.vadAnalyser.frequencyBinCount);
        this.floatFrequencyDataLinear = new Float32Array(this.vadAnalyser.frequencyBinCount);
        this.byteFrequencyData = new Uint8Array(this.levelAnalyser.frequencyBinCount);
        this.vadState.next(false);
        this.pollerNode.onaudioprocess = this.update;
        // connect each analysis node
        this.source.connect(this.levelAnalyser);
        this.source.connect(this.vadAnalyser);
        this.source.connect(this.pollerNode);
        this.pollerNode.connect(this.deadNode); // scriptprocessor doesnt work in chrome if its not connected to an output
        this.deadNode.connect(this.context.destination);
    };
    VoiceAnalyser.prototype.stop = function () {
        if (!this.isRunning())
            return;
        this.source.disconnect(this.levelAnalyser);
        this.source.disconnect(this.vadAnalyser);
        this.source.disconnect(this.pollerNode);
        this.pollerNode.disconnect(this.deadNode);
        this.deadNode.disconnect(this.context.destination);
        this.pollerNode = null;
        this.source = null;
        this.levelAnalyser = null;
        this.vadAnalyser = null;
    };
    VoiceAnalyser.prototype.isRunning = function () { return !!this.source; };
    VoiceAnalyser.prototype.getLevel = function () { return this.level; };
    VoiceAnalyser.prototype.getVoiceDetected = function () { return this.vadState; };
    VoiceAnalyser.prototype.setFilter = function (shape) {
        this.filter = new Float32Array(this.options.fftSize);
        for (var i = 0, iLen = this.options.fftSize / 2; i < iLen; i++) {
            this.filter[i] = 0;
            for (var j = 0, jLen = shape.length; j < jLen; j++) {
                if (i * this.hertzPerBin < shape[j].f) {
                    this.filter[i] = shape[j].v;
                    break; // Exit j loop
                }
            }
        }
    };
    VoiceAnalyser.prototype.updateEnergyAndLevel = function () {
        var _this = this;
        // Update the local version of the Linear FFT and our energy level
        var fft = this.floatFrequencyData;
        var fftL = this.floatFrequencyDataLinear;
        var fftB = this.byteFrequencyData;
        var filter = this.filter;
        var energy = 0;
        var max = 0;
        var sum = 0;
        for (var i = 0, iLen = fft.length; i < iLen; i++) {
            fftL[i] = Math.pow(10, fft[i] / 10);
            energy += filter[i] * fftL[i] * fftL[i];
            max = Math.max(max, fftL[i]);
            sum += fftB[i];
        }
        this.energy = energy;
        this.computedLevel = sum / fftB.length / 255;
        if (this.computedLevel !== this.level.value) {
            this.runner.run(function () { return _this.level.next(_this.computedLevel); });
        }
    };
    VoiceAnalyser.prototype.checkForVoice = function () {
        var _this = this;
        var signal = this.energy - this.energyOffset;
        if (signal > this.energyThresholdPos) {
            this.voiceTrend = (this.voiceTrend + 1 > this.voiceTrendMax) ? this.voiceTrendMax : this.voiceTrend + 1;
        }
        else if (signal < -this.energyThresholdNeg) {
            this.voiceTrend = (this.voiceTrend - 1 < this.voiceTrendMin) ? this.voiceTrendMin : this.voiceTrend - 1;
        }
        else {
            // voiceTrend gets smaller
            if (this.voiceTrend > 0) {
                this.voiceTrend--;
            }
            else if (this.voiceTrend < 0) {
                this.voiceTrend++;
            }
        }
        var start = this.voiceTrend > this.voiceTrendStart; // Start of speech detected
        var end = this.voiceTrend < this.voiceTrendEnd; // End of speech detected
        // Integration brings in the real-time aspect through the relationship with the frequency this functions is called.
        var integration = signal * this.iterationPeriod * this.options.energyIntegration;
        // Idea?: The integration is affected by the voiceTrend magnitude? - Not sure. Not doing atm.
        // The !end limits the offset delta boost till after the end is detected.
        if (integration > 0 || !end) {
            this.energyOffset += integration;
        }
        else {
            this.energyOffset += integration * 10;
        }
        this.energyOffset = this.energyOffset < 0 ? 0 : this.energyOffset;
        this.energyThresholdPos = this.energyOffset * this.options.energyThresholdRatioPos;
        this.energyThresholdNeg = this.energyOffset * this.options.energyThresholdRatioNeg;
        // Broadcast the messages
        if (start && !this.vadState.value) {
            this.runner.run(function () { return _this.vadState.next(true); });
        }
        if (end && this.vadState.value) {
            this.runner.run(function () { return _this.vadState.next(false); });
        }
        return signal;
    };
    return VoiceAnalyser;
}());
exports.VoiceAnalyser = VoiceAnalyser;
//# sourceMappingURL=VoiceAnalyser.js.map