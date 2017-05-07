import Minitter, { Listener } from 'minitter';
import * as StartUp from './startup';
import SimpleCrudApi from './simple-crud';
import * as Trx from './transaction';
export { Schema, IndexDescription, StoreDescription } from './startup';
export { Mode, Selector, AbortFunciton, Executor } from './transaction';
export interface IdxdDBOptions {
    IDBFactory?: IDBFactory;
    IDBKeyRange?: typeof IDBKeyRange;
}
export interface EventTypes {
    ready: BackendAPI;
    error: any;
}
export interface BackendAPI {
    db: IDBDatabase;
    KeyRange: typeof IDBKeyRange;
}
/**
 * Public Api
 *
 * @class IdxdDB
 * @template T - { [storeName]: RecordTypes }
 */
export declare class IdxdDB<T> {
    readonly dbName: string;
    protected _db: IDBDatabase;
    readonly Factory: IDBFactory;
    readonly KeyRange: typeof IDBKeyRange;
    protected _events: Minitter<EventTypes>;
    protected _versionMap: StartUp.VersionMap;
    protected _isOpen: boolean;
    constructor(name: string, options?: IdxdDBOptions);
    readonly db: IDBDatabase;
    readonly currentVersion: number;
    readonly storeNames: keyof T[];
    readonly isOpen: boolean;
    on<K extends keyof EventTypes>(event: K, listener: Listener<EventTypes, K>): void;
    once<K extends keyof EventTypes>(event: K, listener: Listener<EventTypes, K>): void;
    version<T>(no: number, schema: StartUp.Schema, rescue?: StartUp.RescueFunction<T>): this;
    open(): this;
    close(): this;
    delete(onblocked?: () => any): Promise<void>;
    /**
     * Make task implementation awaitable until database is opened.
     *
     * @param {(resolve: Function, reject: Function) => (db: { db: IDBDatabase, KeyRange: typeof IDBKeyRange }) => any} task
     * @returns {Promise<any>}
     *
     */
    awaitable(task: (resolve: Function, reject: Function) => (db: {
        db: IDBDatabase;
        KeyRange: typeof IDBKeyRange;
    }) => any): Promise<any>;
    /**
     * Create transaction explicitly and execute it.
     * Transaction can rollback when you call abort().
     *
     * @template K - keyof store
     * @param {(K | K[])} scope - keyof store
     * @param {('r' | 'rw')} mode
     * @param {Trx.Executor<T>} executor
     * @returns {Promise<any>}
     * @example
     * db.transaction('books', 'rw', function* ($) {
     *    yield $('books').set({ id: 1, title: 'MyBook', page: 10 })
     *    return yield $('books').getAll()
     * })
     *
     */
    transaction<K extends keyof T>(scope: K | K[], mode: Trx.Mode, executor: Trx.Executor<T>): Promise<any>;
    /**
     * Operate single store (e.g. get / set / delete)
     *
     * @template K - store name
     * @param {K} name
     * @returns SimpleCrudApi
     * @example
     * db.store('books').get(1)
     *
     */
    store<K extends keyof T>(name: K): SimpleCrudApi<T, K>;
}
