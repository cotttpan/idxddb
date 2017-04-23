import Minitter, { Listener } from 'minitter';
import * as Luncher from './luncher';
import { Operation, RangeFunction } from './operation';
export { Schema, IndexDescription, StoreDescription } from './luncher';
export interface IdxdDBOptions {
    IDBFactory?: IDBFactory;
    IDBKeyRange?: typeof IDBKeyRange;
}
export interface EventTypes<T> {
    ready: IdxdDB<T>;
    error: any;
}
export declare namespace Trx {
    type Mode = 'r' | 'rw';
    const parseMode: (mode: Mode) => "readwrite" | "readonly";
    interface Selector<T> {
        <K extends keyof T>(store: K): Operation<T, K>;
    }
    interface AbortFunciton {
        (): () => void;
    }
    interface Executor<T> {
        (selector: Selector<T> & {
            abort: AbortFunciton;
        }): IterableIterator<(next: Function) => (IDBRequest | void)>;
    }
}
/**
 * Public Api
 *
 * @class IdxdDB
 * @template T - { [Store]: RecordTypes }
 */
export declare class IdxdDB<T> {
    readonly dbName: string;
    protected _db: IDBDatabase;
    readonly _Factory: IDBFactory;
    readonly KeyRange: typeof IDBKeyRange;
    protected _events: Minitter<EventTypes<T>>;
    protected _versionMap: Map<number, Luncher.Schema>;
    protected _isOpen: boolean;
    constructor(name: string, options?: IdxdDBOptions);
    readonly db: IDBDatabase;
    readonly currentVersion: number;
    readonly storeNames: keyof T[];
    readonly isOpen: boolean;
    on<K extends keyof EventTypes<T>>(event: K, listener: Listener<EventTypes<T>, K>): void;
    once<K extends keyof EventTypes<T>>(event: K, listener: Listener<EventTypes<T>, K>): void;
    version(no: number, schema: Luncher.Schema): this;
    open(): this;
    close(): this;
    delete(onblocked?: () => any): Promise<void>;
    /**
     * Make task implemntation awaitable until database is opening.
     *
     * @param {(resolve: Function, reject: Function) => (self: IdxdDB<T>) => any} task
     * @returns {Promise<any>}
     *
     */
    awaitable(task: (resolve: Function, reject: Function) => (self: IdxdDB<T>) => any): Promise<any>;
    /**
     * Create transaction explicitly and execute it.
     * Transaction can rollback when you call abort().
     *
     * @template K
     * @param {(K | K[])} scope
     * @param {Trx.Mode} mode
     * @param {Trx.Executor<T>} executor
     * @returns {Promise<any>}
     * @example
     * db.transaction('books', 'r', function*($) {
     *    yield $('books').set({ id: 1, title: 'MyBook', page: 10 })
     *    return yield $('books').getAll()
     * })
     *
     */
    transaction<K extends keyof T>(scope: K | K[], mode: Trx.Mode, executor: Trx.Executor<T>): Promise<any>;
    /**
     * Operate single store (e.g. get / set / delete)
     *
     * @template K
     * @param {K} name
     * @returns SimpleCrudApi
     * @example
     * db.store('books').get(1)
     *
     */
    store<K extends keyof T>(name: K): SimpleCrudApi<T, K>;
}
/**
 * Simple CurdApi for single store.
 * Each methods implements one transaction and one operation on single store.
 */
export declare class SimpleCrudApi<T, K extends keyof T> {
    private idxd;
    private store;
    constructor(idxd: IdxdDB<T>, store: K);
    /**
     * Get record count.
     *
     * @returns {Promise<number>}
     * @example
     * db.store('books').count()
     *
     */
    count(): Promise<number>;
    /**
     * Get record by primary key
     *
     * @param {any} key
     * @returns {(Promise<T[K] | undefined>)} record
     * @example
     * db.store('books').get(1)
     *
     */
    get(key: any): Promise<T[K] | undefined>;
    /**
     * Get all record in the store.
     *
     * @returns {Promise<T[K][]>} records
     * @example
     * db.store('books').getAll()
     *
     */
    getAll(): Promise<T[K][]>;
    /**
     * Find record by key range of primary key or by index + key range.
     *
     * @param {(RangeFunction | string)} range or index
     * @param {RangeFunction=} range of index
     * @return {Promise<T[K][]>} records
     * @example
     * // key range of primary key
     * db.store('books').find(range => range.bound(1, 100))
     * @example
     * // key range of index
     * db.store('books').find('page', range => range.bound(200, 500))
     */
    find(range: RangeFunction): Promise<T[K][]>;
    find(index: keyof T[K] | string, range?: RangeFunction): Promise<T[K][]>;
    /**
     * Set record.
     * This method execute IDBDatabase.put().
     *
     * @param {T[K]} record
     * @param {*} [key]
     * @returns {Promise<T[K]>} seved record
     * @example
     * db.store('books').set({ title: 'MyBook', page: 300 })
     *
     */
    set(record: T[K], key?: any): Promise<T[K]>;
    /**
     * Set multi records.
     *
     * @param {T[K][]} records
     * @returns {Promise<T[K][]>} saved records
     * @example
     * db.store('books').bulkSet([{ id: 1, title: 'MyBook1' }, { id: 2, title: 'MyBook2' }])
     */
    bulkSet(records: T[K][]): Promise<T[K][]>;
    /**
     * Delete record by primary key.
     *
     * @param {*} key
     * @returns {(Promise<T[K] | undefined>)} deleted record
     * @example
     * db.store('books').delete(1)
     *
     */
    delete(key: any): Promise<T[K] | undefined>;
    /**
     * Delete multi records by primary keys.
     *
     * @param {any[]} keys
     * @returns {Promise<T[K][]>} deleted records
     * @example
     * db.store('books').bulkDelete([1, 2, 3])
     *
     */
    bulkDelete(keys: any[]): Promise<T[K][]>;
    /**
     * Delete All records in the store.
     *
     * @returns {Promise<T[K][]>} deleted records
     * @example
     * db.store('books').clear()
     *
     */
    clear(): Promise<T[K][]>;
}
