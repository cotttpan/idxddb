import Minitter, { Listener } from 'minitter';
import * as Luncher from './luncher';
import { Operation, RangeFunction } from './operation';
import * as u from './utils';

export { Schema, IndexDescription, StoreDescription } from './luncher';

export interface IdxdDBOptions {
    IDBFactory?: IDBFactory;
    IDBKeyRange?: typeof IDBKeyRange;
}

export interface EventTypes<T> {
    ready: IdxdDB<T>;
    error: any;
}

export namespace Trx {
    export type Mode = 'r' | 'rw';
    export const parseMode = (mode: Mode) => {
        return mode === 'rw' ? 'readwrite' : 'readonly';
    };
    export interface Selector<T> {
        <K extends keyof T>(store: K): Operation<T, K>;
    }
    export interface AbortFunciton {
        (): () => void;
    }
    export interface Executor<T> {
        (selector: Selector<T> & { abort: AbortFunciton }): IterableIterator<(next: Function) => (IDBRequest | void)>;
    }
}

/**
 * Public Api
 *
 * @class IdxdDB
 * @template T - { [storeName]: RecordTypes }
 */
export class IdxdDB<T> {
    readonly dbName: string;
    protected _db: IDBDatabase;
    readonly Factory: IDBFactory;
    readonly KeyRange: typeof IDBKeyRange;
    protected _events = new Minitter<EventTypes<T>>();
    protected _versionMap: Map<number, Luncher.Schema> = new Map();
    protected _isOpen: boolean = false;

    constructor(name: string, options: IdxdDBOptions = {}) {
        this.dbName = name;
        this.Factory = options.IDBFactory || indexedDB;
        this.KeyRange = options.IDBKeyRange || IDBKeyRange;
    }

    // TODO: awaitable
    /* ====================================
     * Getter Property
    ======================================= */
    get db() {
        return this._db;
    }

    get currentVersion() {
        return this._db.version;
    }

    get storeNames() {
        return Array.from<keyof T>(this._db.objectStoreNames as any);
    }

    get isOpen() {
        return this._isOpen;
    }

    /* ====================================
     * Events
    ======================================= */
    on<K extends keyof EventTypes<T>>(event: K, listener: Listener<EventTypes<T>, K>) {
        this._events.on(event, listener);
    }

    once<K extends keyof EventTypes<T>>(event: K, listener: Listener<EventTypes<T>, K>) {
        this._events.once(event, listener);
    }


    /* ====================================
     * Database
    ======================================= */
    version(no: number, schema: Luncher.Schema) {
        this._versionMap.set(no, schema);
        return this;
    }

    open() {
        if (this.isOpen) return this;

        const [version, schema] = u.last(this._versionMap);
        const req = this.Factory.open(this.dbName, version);
        const onerror = (err: DOMError) => this._events.emit('error', err);
        const onsuccess = (db: IDBDatabase) => {
            this._db = db;
            this._isOpen = true;
            this._events.emit('ready', this);
        };

        req.onupgradeneeded = Luncher.onupgradeneeded(schema);
        req.onsuccess = Luncher.onsuccess(onsuccess);
        req.onerror = Luncher.onerror(onerror);

        return this;
    }

    close() {
        this._db.close();
        this._isOpen = false;
        return this;
    }

    delete(onblocked?: () => any) {
        return new Promise<void>((resolve, reject) => {
            this.isOpen && this.close();
            const req = this.Factory.deleteDatabase(this.dbName);

            req.onblocked = function () {
                onblocked && onblocked();
            };
            req.onsuccess = function () {
                resolve();
            };
            req.onerror = function () {
                reject(this.error);
            };
        });
    }

    /* ====================================
     * Transaction
    ======================================= */
    /**
     * Make task implementation awaitable until database is opened.
     *
     * @param {(resolve: Function, reject: Function) => (self: IdxdDB<T>) => any} task
     * @returns {Promise<any>}
     *
     */
    awaitable(task: (resolve: Function, reject: Function) => (self: IdxdDB<T>) => any) {
        return new Promise<any>((resolve, reject) => {
            const _task = task(resolve, u.bundle(reject, (err: any) => this._events.emit('error', err)));
            this.isOpen ? _task(this) : this._events.once('ready', _task);
        });
    }

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
    transaction<K extends keyof T>(scope: K | K[], mode: Trx.Mode, executor: Trx.Executor<T>) {
        const exec = (resolve: Function, reject: Function) => (self: IdxdDB<T>) => {

            const trx = self.db.transaction(scope, Trx.parseMode(mode));
            const select = (store: K) => new Operation<T, K>(self, trx.objectStore(store));
            const abort = () => () => trx.abort();
            const i = executor(Object.assign(select, { abort }));

            trx.addEventListener('error', handleReject);
            trx.addEventListener('abort', handleReject);

            (function tick(value?: any) {
                const ir = i.next(value);
                ir.done ? trx.addEventListener('complete', resolve.bind(null, ir.value)) : ir.value(tick);
            }());

            function handleReject(this: IDBTransaction) {
                reject(this.error);
            }
        };

        return this.awaitable(exec);
    }

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

    store<K extends keyof T>(name: K) {
        return new SimpleCrudApi<T, K>(this, name);
    }
}

/**
 * Simple CurdApi for single store.
 * Each methods implements one transaction and one operation on single store.
 *
 * @template {T} - { [storeName]: RecordTypes }
 * @template {K} - storeName
 */
export class SimpleCrudApi<T, K extends keyof T> {
    private idxd: IdxdDB<T>;
    private store: K;

    constructor(idxd: IdxdDB<T>, store: K) {
        this.idxd = idxd;
        this.store = store;
    }

    /**
     * Get record count
     *
     * @returns {Promise<number>}
     * @example
     * db.store('books').count()
     *
     */
    count(): Promise<number> {
        const self = this;
        return this.idxd.transaction(self.store, 'r', function* ($) {
            return yield $(self.store).count();
        });
    }

    /**
     * Get record by primary key
     *
     * @param {any} key
     * @returns {(Promise<T[K] | undefined>)} record
     * @example
     * db.store('books').get(1)
     *
     */
    get(key: any): Promise<T[K] | undefined> {
        const self = this;
        return this.idxd.transaction(self.store, 'r', function* ($) {
            return yield $(self.store).get(key);
        });
    }

    /**
     * Get all record in the store.
     *
     * @returns {Promise<T[K][]>} records
     * @example
     * db.store('books').getAll()
     *
     */
    getAll(): Promise<T[K][]> {
        const self = this;
        return this.idxd.transaction(self.store, 'r', function* ($) {
            return yield $(self.store).getAll();
        });
    }

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
    find(a1: any, a2?: any): Promise<T[K][]> {
        const self = this;
        const [index, range] = (typeof a1 === 'string') ? [a1, a2] : [undefined, a1];
        return this.idxd.transaction(self.store, 'r', function* ($) {
            const s = $(self.store);
            return yield index ? s.find(index, range).toArray() : s.find(range).toArray();
        });
    }

    /**
     * Set record.
     * This method is executed by IDBDatabase.put().
     *
     * @param {T[K]} record
     * @param {*} [key]
     * @returns {Promise<T[K]>} seved record
     * @example
     * db.store('books').set({ title: 'MyBook', page: 300 })
     *
     */
    set(record: T[K], key?: any): Promise<T[K]> {
        const self = this;
        return this.idxd.transaction(self.store, 'rw', function* ($) {
            return yield $(self.store).set(record, key);
        });
    }

    /**
     * Set multi records.
     *
     * @param {T[K][]} records
     * @returns {Promise<T[K][]>} saved records
     * @example
     * db.store('books').bulkSet([{ id: 1, title: 'MyBook1' }, { id: 2, title: 'MyBook2' }])
     */
    bulkSet(records: T[K][]): Promise<T[K][]> {
        const self = this;
        return this.idxd.transaction(self.store, 'rw', function* ($) {
            const _records: T[K][] = [];
            for (const r of records) _records.push(yield $(self.store).set(r));
            return _records;
        });
    }

    /**
     * Delete record by primary key.
     *
     * @param {*} key
     * @returns {(Promise<T[K] | undefined>)} deleted record
     * @example
     * db.store('books').delete(1)
     *
     */
    delete(key: any): Promise<T[K] | undefined> {
        const self = this;
        return this.idxd.transaction(self.store, 'rw', function* ($) {
            return yield $(self.store).delete(key);
        });
    }

    /**
     * Delete multi records by primary keys.
     *
     * @param {any[]} keys
     * @returns {Promise<T[K][]>} deleted records
     * @example
     * db.store('books').bulkDelete([1, 2, 3])
     *
     */
    bulkDelete(keys: any[]): Promise<T[K][]> {
        const self = this;
        return this.idxd.transaction(self.store, 'rw', function* ($) {
            const _records: T[K][] = [];
            for (const k of keys) _records.push(yield $(self.store).delete(k));
            return _records;
        });
    }

    /**
     * Delete All records in the store.
     *
     * @returns {Promise<T[K][]>} deleted records
     * @example
     * db.store('books').clear()
     *
     */
    clear(): Promise<T[K][]> {
        const self = this;
        return this.idxd.transaction(self.store, 'rw', function* ($) {
            return yield $(self.store).clear();
        });
    }
}
