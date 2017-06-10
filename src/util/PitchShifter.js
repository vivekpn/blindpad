"use strict";
var pool = require('typedarray-pool');
var pitchShift = require('pitch-shift');
var FRAME_SIZE = 1024;
var HOP_SIZE = 256;
var PitchShifter = (function () {
    function PitchShifter(context) {
        var _this = this;
        this.context = context;
        this.targetPitch = null;
        this.pitchScale = null;
        var queue = [];
        var shifter = pitchShift(function (data) {
            var buf = pool.mallocFloat32(data.length);
            buf.set(data);
            queue.push(buf);
        }, function (time, pitch) {
            if (_this.targetPitch !== null) {
                return _this.targetPitch / pitch;
            }
            else if (_this.pitchScale !== null) {
                return _this.pitchScale;
            }
            else {
                return 1.0;
            }
        }, {
            frameSize: FRAME_SIZE,
            hopSize: HOP_SIZE
        });
        // Enque some garbage to buffer stuff
        shifter(new Float32Array(FRAME_SIZE));
        shifter(new Float32Array(FRAME_SIZE));
        shifter(new Float32Array(FRAME_SIZE));
        shifter(new Float32Array(FRAME_SIZE));
        shifter(new Float32Array(FRAME_SIZE));
        // this.node = this.context.createGain();
        // (this.node as GainNode).gain.value = 1.0;
        var node = this.context.createScriptProcessor(FRAME_SIZE, 1, 1);
        node.onaudioprocess = function (e) {
            shifter(e.inputBuffer.getChannelData(0));
            var out = e.outputBuffer.getChannelData(0);
            var q = queue.shift();
            out.set(q);
            pool.freeFloat32(q);
        };
        this.node = node;
    }
    /**
     * Set a constant factor by which the input pitch should be scaled.
     */
    PitchShifter.prototype.setPitchScale = function (pitchScale) {
        this.pitchScale = pitchScale;
        this.targetPitch = null;
    };
    /**
     * Set a goal / target pitch that we will attempt to shift each frame to.
     */
    PitchShifter.prototype.setTargetPitch = function (targetPitch) {
        this.pitchScale = null;
        this.targetPitch = targetPitch;
    };
    /**
     * Returns the processor node for the pitch shift to insert into a WebAudio topology
     */
    PitchShifter.prototype.getNode = function () {
        return this.node;
    };
    return PitchShifter;
}());
exports.PitchShifter = PitchShifter;
//# sourceMappingURL=PitchShifter.js.map