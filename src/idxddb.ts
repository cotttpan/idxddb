import Minitter, { Listener } from 'minitter';
import * as StartUp from './startup';
import SimpleCrudApi from './simple-crud';
import * as Trx from './transaction';
import * as u from './utils';

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
export class IdxdDB<T> {
    readonly dbName: string;
    protected _db: IDBDatabase;
    readonly Factory: IDBFactory;
    readonly KeyRange: typeof IDBKeyRange;
    protected _events = new Minitter<EventTypes>();
    protected _versionMap: StartUp.VersionMap = new Map();
    protected _isOpen: boolean = false;

    constructor(name: string, options: IdxdDBOptions = {}) {
        this.dbName = name;
        this.Factory = options.IDBFactory || indexedDB;
        this.KeyRange = options.IDBKeyRange || IDBKeyRange;
    }

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
    on<K extends keyof EventTypes>(event: K, listener: Listener<EventTypes, K>) {
        this._events.on(event, listener);
    }

    once<K extends keyof EventTypes>(event: K, listener: Listener<EventTypes, K>) {
        this._events.once(event, listener);
    }


    /* ====================================
     * Database
    ======================================= */
    version<T>(no: number, schema: StartUp.Schema, rescue?: StartUp.RescueFunction<T>) {
        this._versionMap.set(no, { schema, rescue });
        return this;
    }

    open() {
        if (this.isOpen) return this;

        const [version] = u.last(this._versionMap);
        const req = this.Factory.open(this.dbName, version);
        const onerror = (err: DOMError) => this._events.emit('error', err);
        const onsuccess = (db: IDBDatabase) => {
            this._db = db;
            this._isOpen = true;
            this._events.emit('ready', { db, KeyRange: this.KeyRange });
        };

        req.onupgradeneeded = StartUp.onupgradeneeded(this._versionMap);
        req.onsuccess = StartUp.onsuccess(onsuccess);
        req.onerror = StartUp.onerror(onerror);

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
     * @param {(resolve: Function, reject: Function) => (db: { db: IDBDatabase, KeyRange: typeof IDBKeyRange }) => any} task
     * @returns {Promise<any>}
     *
     */
    awaitable(task: (resolve: Function, reject: Function) => (db: { db: IDBDatabase, KeyRange: typeof IDBKeyRange }) => any) {
        return new Promise<any>((resolve, reject) => {
            const emitError = (err: any) => this._events.emit('error', err);
            const _reject = u.bundle(reject, emitError);
            const _task = task(resolve, _reject);
            const bk = { db: this.db, KeyRange: this.KeyRange };
            this.isOpen ? _task(bk) : this._events.once('ready', _task);
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
        return this.awaitable(Trx.create<T, K>(scope, mode, executor));
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

