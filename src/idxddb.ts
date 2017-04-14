import Minitter, { Listener } from 'minitter';
import * as Luncher from './luncher';
import { CrudApi as Crud } from './crud';
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
        return Crud.get<T, K>(this._db, store, key);
    }

    getAll<K extends keyof T>(store: K) {
        return Crud.getAll<T, K>(this._db, store);
    }

    set<K extends keyof T>(store: K, record: T[K], key?: any) {
        const publish = (r: T[K]) => this._events.emit('change', {
            type: 'set',
            store,
            records: [r]
        });

        return Crud.set<T, K>(this._db, store, record, key).then(_.tap(publish));
    }

    bulkSet<K extends keyof T>(store: K, records: T[K][]) {
        const publish = (r: T[K][]) => this._events.emit('change', {
            type: 'set',
            store,
            records: r
        });

        return Promise.all(records.map(r => Crud.set<T, K>(this._db, store, r)))
            .then(_.tap(publish));
    }

    delete<K extends keyof T>(store: K, key: any) {
        const publish = (r: T[K]) => this._events.emit('change', {
            type: 'delete',
            store,
            records: [r]
        });

        return Crud.del<T, K>(this._db, store, key).then(_.tap(publish));
    }

    bulkDelete<K extends keyof T>(store: K, keys: any[]) {
        const exists = (r: T[K][]) => r.filter(v => _.existy(v));
        const publish = (r: T[K][]) => this._events.emit('change', {
            type: 'delete',
            store,
            records: r
        });

        return Promise.all(keys.map(k => Crud.del<T, K>(this._db, store, k)))
            .then(exists)
            .then(_.tap(publish)) as Promise<T[K][]>;
    }
}
/* expose
---------------------------------*/
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
