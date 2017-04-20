import Minitter, { Listener } from 'minitter';
import * as Luncher from './luncher';
import { trx, Request } from './transaction';
import * as _ from './utils';

export class IdxdDB<T> {
    readonly databaseName: string;
    protected _db: IDBDatabase;
    protected _IDBFactory: IDBFactory;
    protected _IDBKeyRange: typeof IDBKeyRange;
    protected _events = new Minitter<EventTypes<T>>();
    protected _versions: Map<number, Luncher.Schema> = new Map();
    protected _isOpen: boolean = false;

    constructor(name: string, options: IdxdDBOptions = {}) {
        this.databaseName = name;
        this._IDBFactory = options.IDBFactory || indexedDB;
        this._IDBKeyRange = options.IDBKeyRange || IDBKeyRange;
    }

    /* ====================================
     * Getter Property
    ======================================= */
    get isOpen() {
        return this._isOpen;
    }

    get backendDB() {
        return this._db;
    }

    get currentVersion() {
        return this._db.version;
    }

    get KeyRange() {
        return this._IDBKeyRange;
    }

    get storeNames() {
        return Array.from(this._db.objectStoreNames);
    }

    /* ====================================
     * Database
    ======================================= */
    version(no: number, schema: Luncher.Schema) {
        this._versions.set(no, schema);
        return this;
    }

    open() {
        if (this.isOpen) return this;

        const [version, schema] = _.last(this._versions);
        const req = this._IDBFactory.open(this.databaseName, version);
        const onerror = (err: DOMError) => this._events.emit('error', err);
        const onsuccess = (idb: IDBDatabase) => {
            this._db = idb;
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

    deleteDatabase(done?: Function) {
        const req = this._IDBFactory.deleteDatabase(this.databaseName);
        req.onsuccess = function () {
            done && done(this.result);
        };
    }

    /* ====================================
     * Event
    ======================================= */
    on<K extends keyof EventTypes<T>>(event: K, listener: Listener<EventTypes<T>, K>) {
        this._events.on(event, listener);
    }

    once<K extends keyof EventTypes<T>>(event: K, listener: Listener<EventTypes<T>, K>) {
        this._events.once(event, listener);
    }

    /* ====================================
     * CRUD API
    ======================================= */
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
    transaction<K extends keyof T>(scope: K | K[], mode: 'r' | 'rw', executor: trx.Executor<T>) {
        return new Promise<any>((resolve, reject) => {
            const exec = trx<T>(scope, mode, executor)(
                resolve,
                _.bundle(reject, (err: any) => this._events.emit('error', err))
            );

            if (this.isOpen) {
                exec(this._db, this._IDBKeyRange);
            } else {
                this._events.once('ready', (self) => exec(self.backendDB, self.KeyRange));
            }
        });
    }

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
    get<K extends keyof T>(store: K, key: any): Promise<T[K] | undefined> {
        return this.transaction(store, 'r', function* (req) {
            return yield req.get(store, key);
        });
    }

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
    getBy<K extends keyof T>(store: K, _a1: any, _a2?: any) {
        const params = arguments;
        return this.transaction(store, 'r', function* (req) {
            return yield req.getBy.apply(req, params);
        });
    }

    /**
     * Get all record.
     *
     * @template K
     * @param {K} store
     * @returns {Promise<T[K][]>}
     * @example
     * db.getAll('store')
     */
    getAll<K extends keyof T>(store: K): Promise<T[K][]> {
        return this.transaction(store, 'r', function* (req) {
            return yield req.getAll(store);
        });
    }

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
    set<K extends keyof T>(store: K, record: T[K], key?: any): Promise<T[K]> {
        return this.transaction(store, 'rw', function* (req) {
            return yield req.set(store, record, key);
        });
    }

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
    bulkSet<K extends keyof T>(store: K, records: T[K][]): Promise<T[K][]> {
        return this.transaction(store, 'rw', function* (req) {
            const res: T[K][] = [];
            for (const r of records) res.push(yield req.set(store, r));
            return res;
        });
    }

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
    delete<K extends keyof T>(store: K, key: any): Promise<T[K] | undefined> {
        return this.transaction(store, 'rw', function* (req) {
            return yield req.delete(store, key);
        });
    }

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
    deleteBy<K extends keyof T>(store: K, _a1: any, _a2?: any) {
        const params = arguments;
        return this.transaction(store, 'rw', function* (req) {
            return yield req.deleteBy.apply(req, params);
        });
    }

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
    bulkDelete<K extends keyof T>(store: K, keys: any[]): Promise<T[K][]> {
        return this.transaction(store, 'rw', function* (req) {
            const res: T[K][] = [];
            for (const k of keys) res.push(yield req.delete(store, k));
            return res;
        });
    }

    /**
     * Delete All record.
     *
     * @template K
     * @param {K} store
     * @returns {Promise<T[K][]>}
     * @example
     * db.clear('store')
     */
    clear<K extends keyof T>(store: K): Promise<T[K][]> {
        return this.transaction(store, 'rw', function* (req) {
            return yield req.clear(store);
        });
    }
}

/* ====================================
 * Types
======================================= */
export interface EventTypes<T> {
    ready: IdxdDB<T>;
    error: any;
}

export interface IdxdDBOptions {
    IDBFactory?: IDBFactory;
    IDBKeyRange?: typeof IDBKeyRange;
}

export { Schema, StoreDescription, IndexDescription } from './luncher';
