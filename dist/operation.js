"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const u = require("./utils");
/* ==============================================================
 * Operation
================================================================= */
class Operation {
    constructor(idxd, store) {
        this.idxd = idxd;
        this.store = store;
        this.target = store.name;
    }
}
exports.Operation = Operation;
Operation.prototype.count = count;
Operation.prototype.get = get;
Operation.prototype.getAll = getAll;
Operation.prototype.set = set;
Operation.prototype.delete = del;
Operation.prototype.clear = clear;
Operation.prototype.find = find;
/**
 * Get record count
 *
 * @example
 * db.transaction('store', 'r', function* ($){
 *   const count: number = yield $('store').count()
 * })
 *
 */
function count() {
    return (next) => {
        let count = 0;
        const reciver = () => ++count;
        const req = this.store.openCursor();
        req.addEventListener('success', res.eachValue(() => next(count), reciver));
        return req;
    };
}
exports.count = count;
/**
 * Get record by primary key.
 *
 * @param {*} key
 * @example
 * db.transaction('store', 'r', function* ($){
 *   const record = yield $('store').get(1)
 *   return record // record or undefined
 * })
 *
 */
function get(key) {
    return (next) => {
        const req = this.store.get(key);
        req.addEventListener('success', res.simple(next));
        return req;
    };
}
exports.get = get;
/**
 * Get All records in the store.
 *
 * @example
 * db.transaction('store', 'r', function* ($){
 *   const records = yield $('store').getAll()
 * })
 */
function getAll() {
    return (next) => {
        const records = [];
        const reciver = (cursor) => records.push(cursor.value);
        const req = this.store.openCursor();
        req.addEventListener('success', res.eachValue(next.bind(null, records), reciver));
        return req;
    };
}
exports.getAll = getAll;
/**
 * Set record
 *
 * @param {T[K]} records
 * @param {*} [key]
 * @example
 * @example
 * db.transaction('store', 'rw', function* ($) {
 *   const record = yield $('store').set({ id: 1 })
 *   return record // saved record
 * })
 *
 */
function set(records, key) {
    return (next) => {
        const req = this.store.put(records, key);
        req.addEventListener('success', res.withGet(next, this));
        return req;
    };
}
exports.set = set;
/**
 * Delete record by primary key.
 * This function named 'delete' in the Operation class.
 *
 * @param {*} key
 * @example
 * db.transaction('store', 'rw', function* ($) {
 *   const record = yield $('store').delete(1)
 *   return record // deleted record or undefined
 * })
 *
 */
function del(key) {
    return (next) => {
        const req = this.store.openCursor(this.idxd.KeyRange.only(key));
        const reciver = (cursor) => {
            cursor.delete().onsuccess = next.bind(null, cursor.value);
        };
        req.addEventListener('success', res.matchOne(u.identity, reciver));
        return req;
    };
}
exports.del = del;
/**
 * Clear records in the store.
 *
 * @example
 * db.transaction('store', 'rw', function* ($) {
 *   const records = yield $('store').clear()
 *   return records // deleted records
 * })
 */
function clear() {
    return (next) => {
        const records = [];
        const req = this.store.openCursor();
        const reciver = u.bundle((cursor) => records.push(cursor.value), (cursor) => cursor.delete());
        req.addEventListener('success', res.eachValue(next.bind(null, records), reciver));
        return req;
    };
}
exports.clear = clear;
function find(a1, a2) {
    const [index, range] = (typeof a1 === 'string') ? [a1, a2] : [undefined, a1];
    const target = index ? this.store.index(index) : this.store;
    const getReq = () => target.openCursor(range && range(this.idxd.KeyRange));
    return new FindPhase(getReq, this);
}
exports.find = find;
/* ==============================================================
 * FindPhase
================================================================= */
class FindPhase {
    constructor(getRequest, operation) {
        this.queue = [];
        this._operation = operation;
        this.getRequest = getRequest;
    }
    ///////////// intermediary operation //////////////
    /**
     * Filter finded record.
     *
     * @param {(record: T) => boolean} predicate
     * @returns {FindPhase<T[K]>} this
     * @example
     * db.transaction('store', 'r', function* ($) {
     *   const records = yield $('store').find(range => range.bound(1, 1000))
     *    .filter((record) => record.bool)
     *    .toArray()
     *
     *   return records
     * })
     *
     */
    filter(predicate) {
        const f = (next) => (rec) => predicate(rec) && next(rec);
        this.queue.push(f);
        return this;
    }
    /**
     * Map record to something.
     *
     * @param {(record: T) => R} mapFn
     * @returns {{FindPhase<R>} this}
     * @example
     * db.transaction('store', 'r', function* ($) {
     *   const records = yield $('store').find(range => range.bound(1, 1000))
     *    .map((record) => ({ ...record, a: record.a + 1000 }))
     *    .toArray()
     *
     *   return records // records with mapped
     * })
     *
     */
    map(mapFn) {
        const f = (next) => (rec) => next(mapFn(rec));
        this.queue.push(f);
        return this;
    }
    static compose(q, next) {
        return q.reduceRight((a, b) => b(a), next);
    }
}
exports.FindPhase = FindPhase;
FindPhase.prototype.each = each;
FindPhase.prototype.toArray = toArray;
FindPhase.prototype.batch = batch;
/**
 * Call a function for each record.
 *
 * @param {(record: T) => any} fn
 * @example
 * db.transaction('store', 'r', function* ($) {
 *   yield $('store').find(range => range.bound(1, 100))
 *     .each((record) => doSomething(record))
 * })
 */
function each(fn) {
    return (next) => {
        const records = [];
        const $fn = u.bundle(fn, records.push.bind(records));
        const pipe = FindPhase.compose(this.queue, $fn);
        const reciver = (cursor) => pipe(cursor.value);
        const req = this.getRequest();
        req.addEventListener('success', res.eachValue(next.bind(null, records), reciver));
        return req;
    };
}
exports.each = each;
/**
 * Get finded records as Array.
 *
 * @param {FindPhase<T>} this
 * @example
 * db.transaction('store', 'r', function* ($) {
 *    return yield $('store').find(range => range.bound(1, 100)).toArray()
 * })
 */
function toArray() {
    return (next) => {
        const records = [];
        const pipe = FindPhase.compose(this.queue, records.push.bind(records));
        const reciver = (cursor) => pipe(cursor.value);
        const req = this.getRequest();
        req.addEventListener('success', res.eachValue(next.bind(null, records), reciver));
        return req;
    };
}
exports.toArray = toArray;
function batch(operation, fn) {
    return operation === 'delete' ? _batch.del.call(this) : _batch.update.call(this, fn);
}
exports.batch = batch;
var _batch;
(function (_batch) {
    function del() {
        return (next) => {
            const records = [];
            const pipe = FindPhase.compose(this.queue, records.push.bind(records));
            const reciver = u.bundle((cursor) => pipe(cursor.value), (cursor) => cursor.delete());
            const req = this.getRequest();
            req.addEventListener('success', res.eachValue(next.bind(null, records), reciver));
            return req;
        };
    }
    _batch.del = del;
    function update(updater) {
        return (next) => {
            const self = this;
            const records = [];
            const pipe = FindPhase.compose(this.queue, updater);
            const req = this.getRequest();
            const reciver = (cursor) => {
                const newRecord = pipe(cursor.value);
                if (newRecord) {
                    const _req = cursor.update(newRecord);
                    _req.addEventListener('success', res.withGet(records.push.bind(records), self._operation));
                }
            };
            req.addEventListener('success', res.eachValue(next.bind(null, records), reciver));
            return req;
        };
    }
    _batch.update = update;
})(_batch = exports._batch || (exports._batch = {}));
/* ==============================================================
 * Responce
================================================================= */
var res;
(function (res) {
    res.simple = (next) => function () {
        return next(this.result);
    };
    res.withGet = (next, context) => {
        return function () {
            get.call(context, this.result)(next);
        };
    };
    res.matchOne = (next, reciver) => {
        return function () {
            const cursor = this.result;
            if (cursor) {
                reciver && reciver(cursor);
                next();
            }
        };
    };
    res.eachValue = (next, reciver) => {
        return function () {
            const cursor = this.result;
            if (cursor) {
                reciver && reciver(cursor);
                cursor.continue();
            }
            else {
                next();
            }
        };
    };
})(res = exports.res || (exports.res = {}));
//# sourceMappingURL=operation.js.map