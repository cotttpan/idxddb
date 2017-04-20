import Minitter, { Listener } from 'minitter';
import * as Luncher from './luncher';
import { trx, Request } from './transaction';
export declare class IdxdDB<T> {
    readonly databaseName: string;
    protected _db: IDBDatabase;
    protected _IDBFactory: IDBFactory;
    protected _IDBKeyRange: typeof IDBKeyRange;
    protected _events: Minitter<EventTypes<T>>;
    protected _versions: Map<number, Luncher.Schema>;
    protected _isOpen: boolean;
    constructor(name: string, options?: IdxdDBOptions);
    readonly isOpen: boolean;
    readonly backendDB: IDBDatabase;
    readonly currentVersion: number;
    readonly KeyRange: {
        new (): IDBKeyRange;
        prototype: IDBKeyRange;
        bound(lower: any, upper: any, lowerOpen?: boolean | undefined, upperOpen?: boolean | undefined): IDBKeyRange;
        lowerBound(lower: any, open?: boolean | undefined): IDBKeyRange;
        only(value: any): IDBKeyRange;
        upperBound(upper: any, open?: boolean | undefined): IDBKeyRange;
    };
    readonly storeNames: string[];
    version(no: number, schema: Luncher.Schema): this;
    open(): this;
    close(): this;
    deleteDatabase(done?: Function): void;
    on<K extends keyof EventTypes<T>>(event: K, listener: Listener<EventTypes<T>, K>): void;
    once<K extends keyof EventTypes<T>>(event: K, listener: Listener<EventTypes<T>, K>): void;
    /**
     * Create transaction and execute it.
     * transaction() can rollback when write error occured or you call request.abort().
     * Available request api list is see RequestClass in transaction.ts.
     * request api need 'yield' keyword.
     *
     * @template K
     * @param {(K | K[])} scope
     * @param {('r' | 'rw')} mode
     * @param {trx.Executor<T>} executor
     * @returns {Promise<any>}
     * @example
     * db.tranaction(['store'], 'rw', function*(req) {
     *   const record1 = yield req.set('store', { id: 1 })
     *   return record1;
     * })
     */
    transaction<K extends keyof T>(scope: K | K[], mode: 'r' | 'rw', executor: trx.Executor<T>): Promise<any>;
    /**
     * Get record by primary key
     *
     * @template K
     * @param {K} store
     * @param {*} key
     * @returns {(Promise<T[K] | undefined>)}
     * @example
     * db.get('store', 1)
     */
    get<K extends keyof T>(store: K, key: any): Promise<T[K] | undefined>;
    /**
     * Get records by key range or index and key range.
     *
     * @template K
     * @param {K} store
     * @param {Request.RangeFunction} range
     * @returns {Promise<T[K][]>}
     * @example
     * db.getBy('store', 'index', range => range.bound(1, 5))
     */
    getBy<K extends keyof T>(store: K, range: Request.RangeFunction): Promise<T[K][]>;
    getBy<K extends keyof T>(store: K, index: keyof T[K] | string, range: Request.RangeFunction): Promise<T[K][]>;
    /**
     * Get all record.
     *
     * @template K
     * @param {K} store
     * @returns {Promise<T[K][]>}
     * @example
     * db.getAll('store')
     */
    getAll<K extends keyof T>(store: K): Promise<T[K][]>;
    /**
     * Set record.
     *
     * @template K
     * @param {K} store
     * @param {T[K]} record
     * @param {*} [key]
     * @returns {Promise<T[K]>}
     * @example
     * db.set('store', { id: 1 })
     */
    set<K extends keyof T>(store: K, record: T[K], key?: any): Promise<T[K]>;
    /**
     * Set multi records.
     *
     * @template K
     * @param {K} store
     * @param {T[K][]} records
     * @returns {Promise<T[K][]>}
     * @example
     * db.bulkSet('store', [{ id: 1 }, { id: 2 }])
     */
    bulkSet<K extends keyof T>(store: K, records: T[K][]): Promise<T[K][]>;
    /**
     * Delete record by primary key.
     *
     * @template K
     * @param {K} store
     * @param {*} key
     * @returns {(Promise<T[K] | undefined>)}
     * @example
     * db.delete('store', 1)
     */
    delete<K extends keyof T>(store: K, key: any): Promise<T[K] | undefined>;
    /**
     * Delete records by key range or index and key range
     *
     * @template K
     * @param {K} store
     * @param {Request.RangeFunction} range
     * @returns {Promise<T[K][]>}
     * @example
     * db.deleteBy('store', 'index', range => range.bound(1, 100))
     */
    deleteBy<K extends keyof T>(store: K, range: Request.RangeFunction): Promise<T[K][]>;
    deleteBy<K extends keyof T>(store: K, index: keyof T[K] | string, range: Request.RangeFunction): Promise<T[K][]>;
    /**
     * Delete mutli records by primary keys.
     *
     * @template K
     * @param {K} store
     * @param {any[]} keys
     * @returns {Promise<T[K][]>}
     * @example
     * db.bulkDelete('store', [1, 2, 3])
     */
    bulkDelete<K extends keyof T>(store: K, keys: any[]): Promise<T[K][]>;
    /**
     * Delete All record.
     *
     * @template K
     * @param {K} store
     * @returns {Promise<T[K][]>}
     * @example
     * db.clear('store')
     */
    clear<K extends keyof T>(store: K): Promise<T[K][]>;
}
export interface EventTypes<T> {
    ready: IdxdDB<T>;
    error: any;
}
export interface IdxdDBOptions {
    IDBFactory?: IDBFactory;
    IDBKeyRange?: typeof IDBKeyRange;
}
export { Schema, StoreDescription, IndexDescription } from './luncher';
