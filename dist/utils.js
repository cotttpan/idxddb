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
function includes(iterable, target) {
    return [...iterable].indexOf(target) > -1;
}
exports.includes = includes;
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
    return bundled;
    function bundled() {
        fns.forEach(f => f.apply(null, arguments));
    }
}
exports.bundle = bundle;
function identity(value) {
    return value;
}
exports.identity = identity;
function noop() { }
exports.noop = noop;
function difference(a1, a2) {
    return a1.filter(x => a2.indexOf(x) < 0);
}
exports.difference = difference;
function intersection(a1, a2) {
    return [...new Set([...a1, ...a2])].filter(x => (a1.indexOf(x) > -1 && a2.indexOf(x) > -1));
}
exports.intersection = intersection;
function groupBy(arr, key) {
    return arr.reduce((acc, obj) => {
        const k = obj[key];
        acc[k] = obj;
        return acc;
    }, {});
}
exports.groupBy = groupBy;
function constant(v) {
    return (..._x) => v;
}
exports.constant = constant;
function onlyThatTime(n, callback, init = []) {
    let called = false;
    let count = 0;
    return (n <= 0) ? constant(awaiter)(callback.apply(null, init)) : awaiter;
    function awaiter() {
        count = count + 1;
        if (called)
            return;
        if (n === count) {
            called = true;
            callback.apply(null, arguments);
        }
    }
}
exports.onlyThatTime = onlyThatTime;
//# sourceMappingURL=utils.js.map