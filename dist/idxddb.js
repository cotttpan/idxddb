"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const minitter_1 = require("minitter");
const Luncher = require("./luncher");
const transaction_1 = require("./transaction");
const _ = require("./utils");
class IdxdDB {
    constructor(name, options = {}) {
        this._events = new minitter_1.default();
        this._versions = new Map();
        this._isOpen = false;
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
    version(no, schema) {
        this._versions.set(no, schema);
        return this;
    }
    open() {
        if (this.isOpen)
            return this;
        const [version, schema] = _.last(this._versions);
        const req = this._IDBFactory.open(this.databaseName, version);
        const onerror = (err) => this._events.emit('error', err);
        const onsuccess = (idb) => {
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
    deleteDatabase(done) {
        const req = this._IDBFactory.deleteDatabase(this.databaseName);
        req.onsuccess = function () {
            done && done(this.result);
        };
    }
    /* ====================================
     * Event
    ======================================= */
    on(event, listener) {
        this._events.on(event, listener);
    }
    once(event, listener) {
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
    transaction(scope, mode, executor) {
        return new Promise((resolve, reject) => {
            const exec = transaction_1.trx(scope, mode, executor)(resolve, _.bundle(reject, (err) => this._events.emit('error', err)));
            if (this.isOpen) {
                exec(this._db, this._IDBKeyRange);
            }
            else {
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
    get(store, key) {
        return this.transaction(store, 'r', function* (req) {
            return yield req.get(store, key);
        });
    }
    getBy(store, _a1, _a2) {
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
    getAll(store) {
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
    set(store, record, key) {
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
    bulkSet(store, records) {
        return this.transaction(store, 'rw', function* (req) {
            const res = [];
            for (const r of records)
                res.push(yield req.set(store, r));
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
    delete(store, key) {
        return this.transaction(store, 'rw', function* (req) {
            return yield req.delete(store, key);
        });
    }
    deleteBy(store, _a1, _a2) {
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
    bulkDelete(store, keys) {
        return this.transaction(store, 'rw', function* (req) {
            const res = [];
            for (const k of keys)
                res.push(yield req.delete(store, k));
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
    clear(store) {
        return this.transaction(store, 'rw', function* (req) {
            return yield req.clear(store);
        });
    }
}
exports.IdxdDB = IdxdDB;
//# sourceMappingURL=idxddb.js.map