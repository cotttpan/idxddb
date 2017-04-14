import Minitter, { Listener } from 'minitter';
import * as Luncher from './luncher';
import * as Crud from './crud';
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

    /* ====================================
     * Event
    ======================================= */
    on<K extends keyof EventTypes<T>>(event: K, listener: Listener<EventTypes<T>, K>) {
        this._events.on(event, listener);
    }

    protected _publisher<T>(type: 'set' | 'delete', store: string) {
        return (records: T) => this._events.emit('change', {
            type,
            store: store as any,
            records: ([] as any).concat(records)
        });
    }

    /* ====================================
     * CRUD API
    ======================================= */
    /**
     * Get record from store by primary key.
     * @example
     * get('books', 1)
     */
    get<K extends keyof T>(store: K, key: any) {
        return new Promise<T[K] | undefined>(Crud.get<T, K>(this._db, store, key));
    }

    /**
     * Get record from store by key range
     * @example
     * get('books', range => range.bound(1, 10))
     */
    getBy<K extends keyof T>(store: K, range: (keyrange: typeof IDBKeyRange) => IDBKeyRange) {
        return new Promise<T[K][]>(Crud.getBy<T, K>(this._db, store, range(this._IDBKeyRange)));
    }

    /**
     * Get all record from store
     * @example
     * getAll('books')
     */
    getAll<K extends keyof T>(store: K) {
        return new Promise<T[K][]>(Crud.getAll<T, K>(this._db, store));
    }

    /**
     * Find record from store by index and key range
     * @example
     * find('books', 'page', range => range.bound(300, 500))
     */
    find<K extends keyof T>(store: K, index: keyof T[K], range?: (keyrange: typeof IDBKeyRange) => IDBKeyRange) {
        const _range = range ? range(this._IDBKeyRange) : undefined;
        return new Promise<T[K][] | undefined>(Crud.find<T, K>(this._db, store, index, _range));
    }

    /**
     * Set record to store
     * This method use 'IDBStoreObject.put()' in internal.
     * @example
     * set('books', { id: 1, title: 'IdxdDB', page: 10 })
     */
    set<K extends keyof T>(store: K, record: T[K], key?: any) {
        type R = T[K];
        return new Promise<R>(Crud.set<T, K>(this._db, store, record, key))
            .then(() => this.get(store, key))
            .then(_.tap(this._publisher<R>('set', store)));
    }

    /**
     * Set record to store by Array of record
     * @example
     * bulkSet('books', [
     *   { id: 1, title: 'IdxdDB', page: 10 },
     *   { id: 1, title: 'IdxdDB2', page: 20 }
     * ])
     */
    bulkSet<K extends keyof T>(store: K, records: T[K][]) {
        const _set = (r: T[K]) => new Promise<T[K]>(Crud.set<T, K>(this._db, store, r))
            .then((k: any) => this.get(store, k));

        return Promise.all(records.map(_set))
            .then(_.tap(this._publisher<T[K][]>('set', store)));
    }

    /**
     * Delete record from store by primary key
     * @example
     * delete('books', 1)
     */
    delete<K extends keyof T>(store: K, key: any) {
        return this.get(store, key)
            .then(_.tap<T[K]>(() => new Promise(Crud.del<T, K>(this._db, store, key))))
            .then(_.tap(this._publisher<T[K] | undefined>('delete', store)));
    }

    /**
     * Delete record from store by key range
     * @example
     * deleteBy('books', range => range.bound(1, 10))
     */
    deleteBy<K extends keyof T>(store: K, range: (keyrange: typeof IDBKeyRange) => IDBKeyRange) {
        type R = T[K][];
        return this.getBy(store, range)
            .then(_.tap<R>(() => new Promise(Crud.delBy<T, K>(this._db, store, range(this._IDBKeyRange)))))
            .then(_.tap(this._publisher<R>('delete', store)));
    }

    /**
     * Delete records from store by Array of primary key.
     * bulkDelete('books', [1, 2])
     */
    bulkDelete<K extends keyof T>(store: K, keys: any[]) {
        type R = T[K][];
        const del = () => Promise.all(keys.map((k: any) => {
            return new Promise(Crud.del<T, K>(this._db, store, k));
        }));

        return Promise.all(keys.map((k) => this.get(store, k)))
            .then<R>((r: R) => r.filter(v => _.existy(v)))
            .then(_.tap<R>(del))
            .then(_.tap(this._publisher<R>('delete', store)));
    }

    /**
     * Clear All record from store
     * @example
     * clear('books')
     */
    clear<K extends keyof T>(store: K) {
        type R = T[K][];
        return this.getAll(store)
            .then(_.tap(() => new Promise(Crud.clear<T, K>(this._db, store))))
            .then(_.tap(this._publisher<R>('delete', store)));
    }
}

/* ====================================
 * Types
======================================= */
export interface EventTypes<T> {
    ready: IdxdDB<T>;
    error: DOMError;
    change: ChangeInfo<T>;
}

export interface ChangeInfo<T> {
    type: 'delete' | 'set';
    store: keyof T;
    records: any[];
}

export interface IdxdDBOptions {
    IDBFactory?: IDBFactory;
    IDBKeyRange?: typeof IDBKeyRange;
}

export { Schema, StoreDescription, IndexDescription } from './luncher';
