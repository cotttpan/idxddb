import { IdxdDB } from './idxddb';
import { RangeFunction } from './operation';

/**
 * Simple CurdApi for single store.
 * Each methods implements one transaction and one operation on single store.
 *
 * @template {T} - { [storeName]: RecordTypes }
 * @template {K} - storeName
 */
export default class SimpleCrudApi<T, K extends keyof T> {
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
            return _records as any;
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
            return _records as any;
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
