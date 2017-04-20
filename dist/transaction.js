"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
////////////////////// Transaction //////////////////////
function trx(scope, mode, executor) {
    return (onResolve, onReject) => (db, KeyRange) => {
        const $trx = db.transaction(scope, trx.parseMode(mode));
        const $req = new Request($trx, KeyRange);
        const i = executor($req);
        $trx.addEventListener('error', handleReject);
        $trx.addEventListener('abort', handleReject);
        (function tick(value) {
            const ir = i.next(value);
            ir.done ? onResolve(ir.value) : ir.value(tick);
        }());
        function handleReject() {
            onReject(this.error);
        }
    };
}
exports.trx = trx;
(function (trx) {
    trx.parseMode = (mode) => {
        return mode === 'rw' ? 'readwrite' : 'readonly';
    };
})(trx = exports.trx || (exports.trx = {}));
////////////////////// Request //////////////////////
class Request {
    constructor(trx, KeyRange) {
        this.KeyRange = KeyRange;
        this.trx = trx;
    }
    abort() {
        return () => this.trx.abort();
    }
    get(store, key) {
        return (next) => {
            const req = this.trx.objectStore(store).get(key);
            req.addEventListener('success', Res.simple(next));
            return req;
        };
    }
    getBy(store, a1, a2) {
        return (next) => {
            const [index, range] = typeof a1 === 'string' ? [a1, a2] : [undefined, a1];
            const target = index ? this.trx.objectStore(store).index(index) : this.trx.objectStore(store);
            const req = target.openCursor(range && range(this.KeyRange));
            req.addEventListener('success', Res.matchAll(next));
            return req;
        };
    }
    getAll(store) {
        return (next) => {
            const req = this.trx.objectStore(store).openCursor();
            req.addEventListener('success', Res.matchAll(next));
            return req;
        };
    }
    set(store, record, key) {
        return (next) => {
            const req = this.trx.objectStore(store).put(record, key);
            req.addEventListener('success', (ev) => {
                this.get(store, ev.target.result)(next);
            });
            return req;
        };
    }
    delete(store, key) {
        return (next) => {
            const req = this.trx.objectStore(store).openCursor(this.KeyRange.only(key));
            req.addEventListener('success', function () {
                const cursor = this.result;
                if (cursor) {
                    cursor.delete().onsuccess = next.bind(null, cursor.value);
                }
            });
            return req;
        };
    }
    deleteBy(store, a1, a2) {
        return (next) => {
            const [index, range] = typeof a1 === 'string' ? [a1, a2] : [undefined, a1];
            const target = index ? this.trx.objectStore(store).index(index) : this.trx.objectStore(store);
            const req = target.openCursor(range && range(this.KeyRange));
            req.addEventListener('success', Res.matchAll.withDelete(next));
            return req;
        };
    }
    clear(store) {
        return (next) => {
            const req = this.trx.objectStore(store).openCursor();
            req.addEventListener('success', Res.matchAll.withDelete(next));
            return req;
        };
    }
}
exports.Request = Request;
var Res;
(function (Res) {
    function matchAll(resolve) {
        const records = [];
        return function () {
            const cursor = this.result;
            if (cursor) {
                records.push(cursor.value);
                cursor.continue();
            }
            else {
                resolve(records);
            }
        };
    }
    Res.matchAll = matchAll;
    (function (matchAll) {
        function withDelete(resolve) {
            const records = [];
            return function () {
                const cursor = this.result;
                if (cursor) {
                    records.push(cursor.value);
                    cursor.delete();
                    cursor.continue();
                }
                else {
                    resolve(records);
                }
            };
        }
        matchAll.withDelete = withDelete;
    })(matchAll = Res.matchAll || (Res.matchAll = {}));
    Res.simple = (next) => function () {
        next(this.result);
    };
})(Res || (Res = {}));
//# sourceMappingURL=transaction.js.map