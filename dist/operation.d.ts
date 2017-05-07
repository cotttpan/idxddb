export declare type RangeFunction = (range: typeof IDBKeyRange) => IDBKeyRange;
export declare class Operation<T, K extends keyof T> {
    KeyRange: typeof IDBKeyRange;
    store: IDBObjectStore;
    target: K;
    constructor(KeyRange: typeof IDBKeyRange, store: IDBObjectStore);
    count: typeof count;
    get: typeof get;
    getAll: typeof getAll;
    find: typeof find;
    set: typeof set;
    delete: typeof del;
    clear: typeof clear;
}
/**
 * Get record count
 *
 * @example
 * db.transaction('store', 'r', function* ($){
 *   const count: number = yield $('store').count()
 * })
 *
 */
export declare function count<T, K extends keyof T>(this: Operation<T, K>): (next: Function) => IDBRequest;
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
export declare function get<T, K extends keyof T>(this: Operation<T, K>, key: any): (next: Function) => IDBRequest;
/**
 * Get All records in the store.
 *
 * @example
 * db.transaction('store', 'r', function* ($){
 *   const records = yield $('store').getAll()
 * })
 */
export declare function getAll<T, K extends keyof T>(this: Operation<T, K>): (next: Function) => IDBRequest;
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
export declare function set<T, K extends keyof T>(this: Operation<T, K>, records: T[K], key?: any): (next: Function) => IDBRequest;
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
export declare function del<T, K extends keyof T>(this: Operation<T, K>, key: any): (next: Function) => IDBRequest;
/**
 * Clear records in the store.
 *
 * @example
 * db.transaction('store', 'rw', function* ($) {
 *   const records = yield $('store').clear()
 *   return records // deleted records
 * })
 */
export declare function clear<T, K extends keyof T>(this: Operation<T, K>): (next: Function) => IDBRequest;
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
export declare function find<T, K extends keyof T>(this: Operation<T, K>, range: RangeFunction): FindPhase<T[K]>;
export declare function find<T, K extends keyof T>(this: Operation<T, K>, index: K | string, range?: RangeFunction): FindPhase<T[K]>;
export declare class FindPhase<T> {
    readonly _operation: Operation<any, any>;
    getRequest: () => IDBRequest;
    queue: Function[];
    constructor(getRequest: () => IDBRequest, operation: Operation<any, any>);
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
    filter(predicate: (record: T) => boolean): this;
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
    map<R>(mapFn: (record: T) => R): FindPhase<R>;
    each: typeof each;
    toArray: typeof toArray;
    batch: typeof batch;
    static compose(q: Function[], next: (record: any) => any): Function;
}
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
export declare function each<T>(this: FindPhase<T>, fn: (record: T) => any): (next: Function) => IDBRequest;
/**
 * Get finded records as Array.
 *
 * @param {FindPhase<T>} this
 * @example
 * db.transaction('store', 'r', function* ($) {
 *    return yield $('store').find(range => range.bound(1, 100)).toArray()
 * })
 */
export declare function toArray<T>(this: FindPhase<T>): (next: Function) => IDBRequest;
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
export declare function batch<T>(this: FindPhase<T>, operation: 'delete'): any;
export declare function batch<T>(this: FindPhase<T>, operation: 'update', updater: (record: T) => T): any;
export declare namespace _batch {
    function del<T>(this: FindPhase<T>): (next: Function) => IDBRequest;
    function update<T>(this: FindPhase<T>, updater: (val: T) => T): (next: Function) => IDBRequest;
}
export declare namespace res {
    const simple: (next: Function) => (this: IDBRequest) => any;
    const withGet: (next: Function, context: Operation<any, any>) => (this: IDBRequest) => void;
    const matchOne: (next: Function, reciver?: ((cursor: IDBCursorWithValue) => any) | undefined) => (this: IDBRequest) => void;
    const eachValue: (next: Function, reciver?: ((cursor: IDBCursorWithValue) => any) | undefined) => (this: IDBRequest) => void;
}
