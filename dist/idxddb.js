"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const minitter_1 = require("minitter");
const Luncher = require("./luncher");
const operation_1 = require("./operation");
const u = require("./utils");
var Trx;
(function (Trx) {
    Trx.parseMode = (mode) => {
        return mode === 'rw' ? 'readwrite' : 'readonly';
    };
})(Trx = exports.Trx || (exports.Trx = {}));
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
        return Array.from(this._db.objectStoreNames);
    }
    get isOpen() {
        return this._isOpen;
    }
    /* ====================================
     * Events
    ======================================= */
    on(event, listener) {
        this._events.on(event, listener);
    }
    once(event, listener) {
        this._events.once(event, listener);
    }
    /* ====================================
     * Database
    ======================================= */
    version(no, schema) {
        this._versionMap.set(no, schema);
        return this;
    }
    open() {
        if (this.isOpen)
            return this;
        const [version, schema] = u.last(this._versionMap);
        const req = this.Factory.open(this.dbName, version);
        const onerror = (err) => this._events.emit('error', err);
        const onsuccess = (db) => {
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
     * @param {(resolve: Function, reject: Function) => (self: IdxdDB<T>) => any} task
     * @returns {Promise<any>}
     *
     */
    awaitable(task) {
        return new Promise((resolve, reject) => {
            const _task = task(resolve, u.bundle(reject, (err) => this._events.emit('error', err)));
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
    transaction(scope, mode, executor) {
        const exec = (resolve, reject) => (self) => {
            const trx = self.db.transaction(scope, Trx.parseMode(mode));
            const select = (store) => new operation_1.Operation(self, trx.objectStore(store));
            const abort = () => () => trx.abort();
            const i = executor(Object.assign(select, { abort }));
            trx.addEventListener('error', handleReject);
            trx.addEventListener('abort', handleReject);
            (function tick(value) {
                const ir = i.next(value);
                ir.done ? trx.addEventListener('complete', resolve.bind(null, ir.value)) : ir.value(tick);
            }());
            function handleReject() {
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
    store(name) {
        return new SimpleCrudApi(this, name);
    }
}
exports.IdxdDB = IdxdDB;
/**
 * Simple CurdApi for single store.
 * Each methods implements one transaction and one operation on single store.
 *
 * @template {T} - { [storeName]: RecordTypes }
 * @template {K} - storeName
 */
class SimpleCrudApi {
    constructor(idxd, store) {
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
    count() {
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
    get(key) {
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
    getAll() {
        const self = this;
        return this.idxd.transaction(self.store, 'r', function* ($) {
            return yield $(self.store).getAll();
        });
    }
    find(a1, a2) {
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
    set(record, key) {
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
    bulkSet(records) {
        const self = this;
        return this.idxd.transaction(self.store, 'rw', function* ($) {
            const _records = [];
            for (const r of records)
                _records.push(yield $(self.store).set(r));
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
    delete(key) {
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
    bulkDelete(keys) {
        const self = this;
        return this.idxd.transaction(self.store, 'rw', function* ($) {
            const _records = [];
            for (const k of keys)
                _records.push(yield $(self.store).delete(k));
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
    clear() {
        const self = this;
        return this.idxd.transaction(self.store, 'rw', function* ($) {
            return yield $(self.store).clear();
        });
    }
}
exports.SimpleCrudApi = SimpleCrudApi;
//# sourceMappingURL=idxddb.js.map