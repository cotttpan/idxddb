"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const minitter_1 = require("minitter");
const StartUp = require("./startup");
const simple_crud_1 = require("./simple-crud");
const Trx = require("./transaction");
const u = require("./utils");
/**
 * Public Api
 *
 * @class IdxdDB
 * @template T - { [storeName]: RecordTypes }
 */
class IdxdDB {
    constructor(name, options = {}) {
        this._events = new minitter_1.default();
        this._versionMap = new Map();
        this._isOpen = false;
        this._on = this._events.on.bind(this._events);
        this._once = this._events.once.bind(this._events);
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
        return Array.from(this._db.objectStoreNames);
    }
    get isOpen() {
        return this._isOpen;
    }
    /* ====================================
     * Events
    ======================================= */
    get events() {
        return {
            on: this._on,
            once: this._once
        };
    }
    /* ====================================
     * Database
    ======================================= */
    version(no, schema, rescue) {
        this._versionMap.set(no, { schema, rescue });
        return this;
    }
    open() {
        if (this.isOpen)
            return this;
        const [version] = u.last(this._versionMap);
        const req = this.Factory.open(this.dbName, version);
        const onerror = (err) => this._events.emit('error', err);
        const onsuccess = (db) => {
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
    delete(onblocked) {
        return new Promise((resolve, reject) => {
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
    awaitable(task) {
        return new Promise((resolve, reject) => {
            const emitError = (err) => this._events.emit('error', err);
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
    transaction(scope, mode, executor) {
        return this.awaitable(Trx.create(scope, mode, executor));
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
    store(name) {
        return new simple_crud_1.default(this, name);
    }
}
exports.IdxdDB = IdxdDB;
//# sourceMappingURL=idxddb.js.map