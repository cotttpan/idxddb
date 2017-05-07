"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
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
exports.default = SimpleCrudApi;
//# sourceMappingURL=simple-crud.js.map