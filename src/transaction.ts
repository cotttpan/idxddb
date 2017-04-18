////////////////////// Transaction //////////////////////
export function trx<T>(scope: string | string[], mode: 'r' | 'rw', executor: trx.Executor<T>) {
    return (onResolve: Function, onReject: Function) => (db: IDBDatabase, KeyRange: typeof IDBKeyRange) => {
        const $trx = db.transaction(scope, trx.parseTrxMode(mode));
        const i = executor(new Request<T>(KeyRange));

        $trx.addEventListener('error', function () {
            onReject(this.error);
        });

        (function tick(value?: any) {
            const ir = i.next(value);
            ir.done ? onResolve(ir.value) : ir.value($trx, tick);
        }());
    };
}

export namespace trx {
    export interface Executor<T> {
        (request: Request<T>): IterableIterator<(trx: IDBTransaction, next: Function) => IDBRequest>;
    }

    export const parseTrxMode = (mode: 'r' | 'rw') => {
        return mode === 'rw' ? 'readwrite' : 'readonly';
    };
}

////////////////////// Request //////////////////////
// TODO: req.abort()
export class Request<T> {
    protected KeyRange: typeof IDBKeyRange;
    constructor(KeyRange: typeof IDBKeyRange) {
        this.KeyRange = KeyRange;
    }

    get<K extends keyof T>(store: K, key: any) {
        return (trx: IDBTransaction, next: Function) => {
            const req = trx.objectStore(store).get(key);
            req.addEventListener('success', Res.simple(next));
            return req;
        };
    }

    getBy<K extends keyof T>(store: K, range: Request.RangeFunction): Request.ReturnFunction;
    getBy<K extends keyof T>(store: K, index: keyof T[K], range: Request.RangeFunction): Request.ReturnFunction;
    getBy(store: string, a1: any, a2?: any): Request.ReturnFunction {
        return (trx: IDBTransaction, next: Function) => {
            const [index, range] = typeof a1 === 'string' ? [a1, a2] : [undefined, a1];
            const target = index ? trx.objectStore(store).index(index) : trx.objectStore(store);
            const req = target.openCursor(range && range(this.KeyRange));
            req.addEventListener('success', Res.matchAll(next));
            return req;
        };
    }

    getAll<K extends keyof T>(store: K) {
        return (trx: IDBTransaction, next: Function) => {
            const req = trx.objectStore(store).openCursor();
            req.addEventListener('success', Res.matchAll(next));
            return req;
        };
    }

    set<K extends keyof T>(store: K, record: T[K], key?: any) {
        return (trx: IDBTransaction, next: Function) => {
            const req = trx.objectStore(store).put(record, key);
            req.addEventListener('success', (ev: Request.ReqEvent) => {
                this.get(store, ev.target.result)(trx, next);
            });
            return req;
        };
    }

    delete<K extends keyof T>(store: K, key: any) {
        return (trx: IDBTransaction, next: Function) => {
            const req = trx.objectStore(store).openCursor(this.KeyRange.only(key));
            req.addEventListener('success', function (this: IDBRequest) {
                const cursor: IDBCursorWithValue = this.result;
                cursor && next(cursor.value);
            });
            return req;
        };
    }

    deleteBy<K extends keyof T>(store: K, range: Request.RangeFunction): Request.ReturnFunction;
    deleteBy<K extends keyof T>(store: K, index: keyof T[K], range: Request.RangeFunction): Request.ReturnFunction;
    deleteBy(store: string, a1: any, a2?: any): Request.ReturnFunction {
        return (trx: IDBTransaction, next: Function) => {
            const [index, range] = typeof a1 === 'string' ? [a1, a2] : [undefined, a1];
            const target = index ? trx.objectStore(store).index(index) : trx.objectStore(store);
            const req = target.openCursor(range && range(this.KeyRange));
            req.addEventListener('success', Res.matchAll.withDelete(next));
            return req;
        };
    }

    clear<K extends keyof T>(store: K) {
        return (trx: IDBTransaction, next: Function) => {
            const req = trx.objectStore(store).openCursor();
            req.addEventListener('success', Res.matchAll.withDelete(next));
            return req;
        };
    }
}

export namespace Request {
    export type ReqEvent = Event & { target: { result: any } };
    export type RangeFunction = (keyrange: typeof IDBKeyRange) => IDBKeyRange;
    export type ReturnFunction = (trx: IDBTransaction, next: Function) => IDBRequest;
}

namespace Res {
    export function matchAll(resolve: Function) {
        const records: any[] = [];
        return function (this: IDBRequest) {
            const cursor: IDBCursorWithValue = this.result;
            if (cursor) {
                records.push(cursor.value);
                cursor.continue();
            } else {
                resolve(records);
            }
        };
    }

    export namespace matchAll {
        export function withDelete(resolve: Function) {
            const records: any[] = [];
            return function (this: IDBRequest) {
                const cursor: IDBCursorWithValue = this.result;
                if (cursor) {
                    records.push(cursor.value);
                    cursor.delete();
                    cursor.continue();
                } else {
                    resolve(records);
                }
            };
        }
    }

    export const simple = (next: Function) => function (this: IDBRequest) {
        next(this.result);
    };
}

