import Minitter, { Listener } from 'minitter';
import * as Luncher from './luncher';
import * as Crud from './crud';
import * as _ from './utils';

class IdxdDB<T> {
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

    on<K extends keyof EventTypes<T>>(event: K, listener: Listener<EventTypes<T>, K>) {
        this._events.on(event, listener);
    }

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

    get<K extends keyof T>(store: K, key: any) {
        return new Promise<T[K] | undefined>(Crud.get<T, K>(this._db, store, key));
    }

    getBy<K extends keyof T>(store: K, range: (keyrange: typeof IDBKeyRange) => IDBKeyRange) {
        return new Promise<T[K][]>(Crud.getBy<T, K>(this._db, store, range(this._IDBKeyRange)));
    }

    getAll<K extends keyof T>(store: K) {
        return new Promise<T[K][]>(Crud.getAll<T, K>(this._db, store));
    }

    find<K extends keyof T>(store: K, index: keyof T[K], range?: (keyrange: typeof IDBKeyRange) => IDBKeyRange) {
        const _range = range ? range(this._IDBKeyRange) : undefined;
        return new Promise<T[K][] | undefined>(Crud.find<T, K>(this._db, store, index, _range));
    }

    set<K extends keyof T>(store: K, record: T[K], key?: any) {
        const publish = (r: T[K]) => this._events.emit('change', {
            type: 'set',
            store,
            records: [r]
        });

        return new Promise<T[K]>(Crud.set<T, K>(this._db, store, record, key))
            .then(() => this.get(store, key)).then(_.tap(publish));
    }

    bulkSet<K extends keyof T>(store: K, records: T[K][]) {
        const publish = (r: T[K][]) => this._events.emit('change', {
            type: 'set',
            store,
            records: r
        });

        const set = (r: T[K]) => new Promise<T[K]>(Crud.set<T, K>(this._db, store, r))
            .then((k: any) => this.get(store, k));

        return Promise.all(records.map(set)).then(_.tap(publish));
    }

    delete<K extends keyof T>(store: K, key: any) {
        const publish = (r: T[K]) => this._events.emit('change', {
            type: 'delete',
            store,
            records: [r]
        });

        return this.get(store, key)
            .then(_.tap<T[K]>(() => new Promise(Crud.del<T, K>(this._db, store, key))))
            .then(_.tap(publish));
    }

    bulkDelete<K extends keyof T>(store: K, keys: any[]) {
        type Rs = T[K][];
        const publish = (r: Rs) => this._events.emit('change', {
            type: 'delete',
            store,
            records: r
        });

        const del = () => Promise.all(keys.map((k: any) => {
            return new Promise(Crud.del<T, K>(this._db, store, k));
        }));

        return Promise.all(keys.map((k) => this.get(store, k)))
            .then<Rs>((r: Rs) => r.filter(v => _.existy(v)))
            .then(_.tap<Rs>(del))
            .then(_.tap(publish));
    }

    clear<K extends keyof T>(store: K) {
        const publish = (r: T[K][]) => this._events.emit('change', {
            type: 'delete',
            store,
            records: r
        });
        return this.getAll(store)
            .then(_.tap(() => new Promise(Crud.clear<T, K>(this._db, store))))
            .then(_.tap(publish));
    }
}

export { IdxdDB };

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
