import { IdxdDB } from './idxddb';
import * as u from './utils';

export type RangeFunction = (range: typeof IDBKeyRange) => IDBKeyRange;

/* ==============================================================
 * Operation
================================================================= */
export class Operation<T, K extends keyof T> {
    idxd: IdxdDB<T>;
    store: IDBObjectStore;
    target: K; // store name

    constructor(idxd: IdxdDB<T>, store: IDBObjectStore) {
        this.idxd = idxd;
        this.store = store;
        this.target = store.name as K;
    }

    count: typeof count;
    get: typeof get;
    getAll: typeof getAll;
    find: typeof find;
    set: typeof set;
    delete: typeof del;
    clear: typeof clear;
}

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
export function count<T, K extends keyof T>(this: Operation<T, K>) {
    return (next: Function) => {
        let count = 0;
        const reciver = () => ++count;
        const req = this.store.openCursor();
        req.addEventListener('success', res.eachValue(() => next(count), reciver));
        return req;
    };
}

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
export function get<T, K extends keyof T>(this: Operation<T, K>, key: any) {
    return (next: Function) => {
        const req = this.store.get(key);
        req.addEventListener('success', res.simple(next));
        return req;
    };
}

/**
 * Get All records in the store.
 *
 * @example
 * db.transaction('store', 'r', function* ($){
 *   const records = yield $('store').getAll()
 * })
 */
export function getAll<T, K extends keyof T>(this: Operation<T, K>) {
    return (next: Function) => {
        const records: T[K][] = [];
        const reciver = (cursor: IDBCursorWithValue) => records.push(cursor.value);
        const req = this.store.openCursor();
        req.addEventListener('success', res.eachValue(next.bind(null, records), reciver));
        return req;
    };
}

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
export function set<T, K extends keyof T>(this: Operation<T, K>, records: T[K], key?: any) {
    return (next: Function) => {
        const req = this.store.put(records, key);
        req.addEventListener('success', res.withGet(next, this));
        return req;
    };
}

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
export function del<T, K extends keyof T>(this: Operation<T, K>, key: any) {
    return (next: Function) => {
        const req = this.store.openCursor(this.idxd.KeyRange.only(key));
        const reciver = (cursor: IDBCursorWithValue) => {
            cursor.delete().onsuccess = next.bind(null, cursor.value);
        };
        req.addEventListener('success', res.matchOne(u.identity, reciver));
        return req;
    };
}

/**
 * Clear records in the store.
 *
 * @example
 * db.transaction('store', 'rw', function* ($) {
 *   const records = yield $('store').clear()
 *   return records // deleted records
 * })
 */
export function clear<T, K extends keyof T>(this: Operation<T, K>) {
    return (next: Function) => {
        const records: T[K][] = [];
        const req = this.store.openCursor();
        const reciver = u.bundle<IDBCursorWithValue>(
            (cursor) => records.push(cursor.value),
            (cursor) => cursor.delete(),
        );
        req.addEventListener('success', res.eachValue(next.bind(null, records), reciver));
        return req;
    };
}


/**
 * Find records by key range of primary key or by index + key range of index.
 *
 * @param {(RangeFunction | string)} range or index
 * @param {RangeFunction=} range
 * @returns {FindPhase<T[K]>}
 * @example
 * db.transaction('store', 'r', function* ($) {
 *   const records = yield $('store').find(range => range.bound(1, 100)).toArray()
 *   return records // finded records
 * })
 * @example
 * db.transaction('store', 'r', function* ($) {
 *   const records = yield $('store').find('index', range => range.bound(1, 100)).toArray()
 *   return records // finded records
 * })
 *
 */
export function find<T, K extends keyof T>(this: Operation<T, K>, range: RangeFunction): FindPhase<T[K]>;
export function find<T, K extends keyof T>(this: Operation<T, K>, index: K | string, range?: RangeFunction): FindPhase<T[K]>;
export function find<T, K extends keyof T>(this: Operation<T, K>, a1: any, a2?: any): FindPhase<T[K]> {
    const [index, range] = (typeof a1 === 'string') ? [a1, a2] : [undefined, a1];
    const target = index ? this.store.index(index) : this.store;
    const getReq = () => target.openCursor(range && range(this.idxd.KeyRange));
    return new FindPhase<T[K]>(getReq, this);
}


/* ==============================================================
 * FindPhase
================================================================= */
export class FindPhase<T> {
    readonly _operation: Operation<any, any>;
    getRequest: () => IDBRequest;
    queue: Function[] = [];
    constructor(getRequest: () => IDBRequest, operation: Operation<any, any>) {
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
    filter(predicate: (record: T) => boolean) {
        const f = (next: Function) => (rec: T) => predicate(rec) && next(rec);
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
    map<R>(mapFn: (record: T) => R) {
        const f = (next: Function) => (rec: T) => next(mapFn(rec));
        this.queue.push(f);
        return this as any as FindPhase<R>;
    }

    /////////////// end operation /////////////////
    each: typeof each;
    toArray: typeof toArray;
    batch: typeof batch;

    static compose(q: Function[], next: (record: any) => any) {
        return q.reduceRight((a, b) => b(a), next);
    }
}

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
export function each<T>(this: FindPhase<T>, fn: (record: T) => any) {
    return (next: Function) => {
        const records: T[] = [];
        const $fn = u.bundle(fn, records.push.bind(records));
        const pipe = FindPhase.compose(this.queue, $fn);
        const reciver = (cursor: IDBCursorWithValue) => pipe(cursor.value);

        const req = this.getRequest();
        req.addEventListener('success', res.eachValue(next.bind(null, records), reciver));

        return req;
    };
}

/**
 * Get finded records as Array.
 *
 * @param {FindPhase<T>} this
 * @example
 * db.transaction('store', 'r', function* ($) {
 *    return yield $('store').find(range => range.bound(1, 100)).toArray()
 * })
 */
export function toArray<T>(this: FindPhase<T>) {
    return (next: Function) => {
        const records: T[] = [];
        const pipe = FindPhase.compose(this.queue, records.push.bind(records));
        const reciver = (cursor: IDBCursorWithValue) => pipe(cursor.value);
        const req = this.getRequest();
        req.addEventListener('success', res.eachValue(next.bind(null, records), reciver));

        return req;
    };
}

/**
 * Batch operation.
 * batch() can delete or update each record.
 *
 * @param {FindPhase<T>} this
 * @returns {*}
 * @example
 * // delete each record
 * db.transaction('store', 'rw', function* ($) {
 *   const records = yield $('store').find(range => range.bound(1, 100))
 *     .batch('delete')
 *
 *   return records // deleted records
 * })
 * @example
 * // update each record
 * db.transaction('store', 'rw', function* ($) {
 *   const records = yield $('store').find(range => range.bound(1, 100))
 *     .batch('update', (record) => ({...record, done: true }))
 *
 *   return records // updated records
 * })
 *
 */
export function batch<T>(this: FindPhase<T>, operation: 'delete'): any;
export function batch<T>(this: FindPhase<T>, operation: 'update', updater: (record: T) => T): any;
export function batch<T>(this: FindPhase<T>, operation: 'delete' | 'update', fn?: Function): any {
    return operation === 'delete' ? _batch.del.call(this) : _batch.update.call(this, fn);
}

export namespace _batch {
    export function del<T>(this: FindPhase<T>) {
        return (next: Function) => {
            const records: T[] = [];
            const pipe = FindPhase.compose(this.queue, records.push.bind(records));
            const reciver = u.bundle<IDBCursorWithValue>(
                (cursor) => pipe(cursor.value),
                (cursor) => cursor.delete(),
            );
            const req = this.getRequest();
            req.addEventListener('success', res.eachValue(next.bind(null, records), reciver));
            return req;
        };
    }

    export function update<T>(this: FindPhase<T>, updater: (val: T) => T) {
        return (next: Function) => {
            const self = this;
            const records: T[] = [];
            const pipe = FindPhase.compose(this.queue, updater);
            const req = this.getRequest();
            const reciver = (cursor: IDBCursorWithValue) => {
                const newRecord = pipe(cursor.value);
                if (newRecord) {
                    const _req = cursor.update(newRecord);
                    _req.addEventListener('success',
                        res.withGet(
                            records.push.bind(records),
                            self._operation,
                        ),
                    );
                }
            };

            req.addEventListener('success', res.eachValue(next.bind(null, records), reciver));

            return req;
        };
    }
}

/* ==============================================================
 * Responce
================================================================= */
export namespace res {
    export const simple = (next: Function) => function (this: IDBRequest) {
        return next(this.result);
    };

    export const withGet = (next: Function, context: Operation<any, any>) => {
        return function (this: IDBRequest) {
            get.call(context, this.result)(next);
        };
    };

    export const matchOne = (next: Function, reciver?: (cursor: IDBCursorWithValue) => any) => {
        return function (this: IDBRequest) {
            const cursor: IDBCursorWithValue = this.result;
            if (cursor) {
                reciver && reciver(cursor);
                next();
            }
        };
    };

    export const eachValue = (next: Function, reciver?: (cursor: IDBCursorWithValue) => any) => {
        return function (this: IDBRequest) {
            const cursor: IDBCursorWithValue = this.result;
            if (cursor) {
                reciver && reciver(cursor);
                cursor.continue();
            } else {
                next();
            }
        };
    };
}
