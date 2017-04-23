"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function has(target, key) {
    return target.hasOwnProperty(key);
}
exports.has = has;
function last(iterable) {
    const arr = Array.from(iterable);
    return arr[arr.length - 1];
}
exports.last = last;
function tap(fn) {
    return (val) => {
        fn(val);
        return val;
    };
}
exports.tap = tap;
function existy(v) {
    return !(v === null || v === undefined);
}
exports.existy = existy;
function bundle(...fns) {
    return function (...v) {
        fns.forEach(f => f.apply(null, v));
    };
}
exports.bundle = bundle;
function identity(value) {
    return value;
}
exports.identity = identity;
//# sourceMappingURL=utils.js.map