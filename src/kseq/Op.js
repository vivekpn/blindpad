"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var idents_1 = require('./idents');
var INSERT_PREFIX = '+';
var REMOVE_PREFIX = '-';
var SEPARATOR = '/';
/**
 * The kind of operation.
 */
(function (OpKind) {
    /**
     * The insertion of a value.
     */
    OpKind[OpKind["Insert"] = 1] = "Insert";
    /**
     * The removal of a value.
     */
    OpKind[OpKind["Remove"] = 2] = "Remove";
})(exports.OpKind || (exports.OpKind = {}));
var OpKind = exports.OpKind;
/**
 * An operation that can be applied to a KSeq.
 */
var Op = (function () {
    /**
     * Creates an instance of Op.
     * @param kind      The kind of operation.
     * @param replica   The name of the replica on which the operation was performed.
     * @param timestamp A UNIX epoch timestamp for the wall time when the operation was performed.
     * @returns An instance of Op.
     */
    function Op(kind, replica, timestamp) {
        this.kind = kind;
        this.replica = replica;
        this.timestamp = timestamp;
    }
    /**
     * Converts an encoded string to an Op of the correct type.
     * @param str The encoded string.
     * @returns An instance of the encoded Op.
     */
    Op.parse = function (str) {
        var kind = str[0];
        switch (kind) {
            case INSERT_PREFIX: return InsertOp.parse(str);
            case REMOVE_PREFIX: return RemoveOp.parse(str);
            default: throw new Error("First character must be " + INSERT_PREFIX + " or " + REMOVE_PREFIX);
        }
    };
    return Op;
}());
exports.Op = Op;
/**
 * An operation that inserts an atom into the sequence with the specified
 * identifier and value.
 */
var InsertOp = (function (_super) {
    __extends(InsertOp, _super);
    /**
     * Creates an instance of InsertOp.
     * @param replica   The name of the replica on which the operation was performed.
     * @param timestamp A UNIX epoch timestamp for the wall time when the operation was performed.
     * @param id        The identifier for the value.
     * @param value     The value to insert.
     * @returns An instance of InsertOp.
     */
    function InsertOp(replica, timestamp, id, value) {
        _super.call(this, OpKind.Insert, replica, timestamp);
        this.id = id;
        this.value = value;
    }
    /**
     * Converts an encoded string to an InsertOp.
     * @param str The encoded string.
     * @returns An instance of the encoded InsertOp.
     */
    InsertOp.parse = function (str) {
        var parts = str.substring(1).split(SEPARATOR);
        var value = parts.length > 4 ? parts.slice(3, parts.length).join(SEPARATOR) : parts[3]; // in case our separator was included
        return new InsertOp(parts[0], Number(parts[1]), idents_1.Ident.parse(parts[2]), JSON.parse(value));
    };
    /**
     * @inheritdoc
     */
    InsertOp.prototype.toString = function () {
        return "" + INSERT_PREFIX + this.timestamp + SEPARATOR + this.replica + SEPARATOR + this.id.toString() + SEPARATOR + JSON.stringify(this.value);
    };
    return InsertOp;
}(Op));
exports.InsertOp = InsertOp;
/**
 * An operation that removes an atom with the specified identifer.
 */
var RemoveOp = (function (_super) {
    __extends(RemoveOp, _super);
    /**
     * Creates an instance of RemoveOp.
     * @param replica   The name of the replica on which the operation was performed.
     * @param timestamp A UNIX epoch timestamp for the wall time when the operation was performed.
     * @param id        The identifier of the atom to remove.
     * @returns An instance of RemoveOp.
     */
    function RemoveOp(replica, timestamp, id) {
        _super.call(this, OpKind.Remove, replica, timestamp);
        this.id = id;
    }
    /**
     * Converts an encoded string to an RemoveOp.
     * @param str The encoded string.
     * @returns An instance of the encoded RemoveOp.
     */
    RemoveOp.parse = function (str) {
        var _a = str.substring(1).split(SEPARATOR, 3), timestamp = _a[0], replica = _a[1], id = _a[2];
        return new RemoveOp(replica, Number(timestamp), idents_1.Ident.parse(id));
    };
    /**
     * @inheritdoc
     */
    RemoveOp.prototype.toString = function () {
        return "" + REMOVE_PREFIX + this.timestamp + SEPARATOR + this.replica + SEPARATOR + this.id.toString();
    };
    return RemoveOp;
}(Op));
exports.RemoveOp = RemoveOp;
//# sourceMappingURL=Op.js.map