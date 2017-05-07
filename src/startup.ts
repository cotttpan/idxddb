import * as _ from './utils';

// ------------------------------------------
// Types
// ------------------------------------------
export type VersionMap = Map<number, VersionUpdateInfo>;

export interface VersionUpdateInfo {
    schema: Schema;
    rescue?: RescueFunction<any>;
}

export type Schema = $Store.Description[];
export type RescueFunction<T> = (lostdata: Partial<T>) => any;
export type IndexDescription = $Index.Description;
export type StoreDescription = $Store.Description;

// -------------------------------------------
// API
// -------------------------------------------
export const onsuccess = (tap: (idb: IDBDatabase) => any) => function (this: IDBRequest) {
    tap(this.result);
};

export const onerror = (tap: (error: DOMError) => any) => function (this: IDBRequest) {
    tap(this.error);
};

export const onupgradeneeded = (versionMap: VersionMap) => function (this: IDBOpenDBRequest, ev: IDBVersionChangeEvent) {
    const db: IDBDatabase = this.result;
    const trx = this.transaction;
    const newVersion = ev.newVersion || _.last(versionMap.keys());
    const operation = {
        create: $Store.creator(db),
        update: $Store.updater(trx),
        delete: $Store.deleter(db, trx),
    };

    /*
      * 1. [createStores, updateStoresIndexes, deleteStores(with buckup)]
      * 2. wait a backup
      * 3. call rescue function
      * 4. next version migration
      */
    (function migrate(v: number) {
        if (v > newVersion) return;

        const { schema, rescue } = versionMap.get(v)!;
        const $schema = _.groupBy(schema, 'name');

        const sNames = {
            exists: Array.from(db.objectStoreNames),
            desced: Object.keys($schema),
        };

        const next = _.bundle(rescue || _.noop, migrate.bind(null, v + 1));

        (function __CREATE_STORE__() {
            const stores = (v === 1) ? sNames.desced : _.difference(sNames.desced, sNames.exists);
            stores.forEach(name => operation.create(name, $schema[name]));
        }());

        (function __UPDATE_STORE__() {
            const stores = (v === 1) ? sNames.desced : _.intersection(sNames.desced, sNames.exists);
            stores.forEach(name => operation.update(name, $schema[name]));
        }());

        (function __DELETE_STORE__() {
            const stores = (v === 1) ? [] as string[] : _.difference(sNames.exists, sNames.desced);
            const records: any = {};
            const setRecord = (name: string, record: any[]) => records[name] = record;
            const awaiter = _.onlyThatTime(stores.length, next.bind(null, records));
            stores.forEach(name => operation.delete(name, _.bundle(setRecord, awaiter), { backup: !!rescue }));
        }());
    }(ev.oldVersion ? ev.oldVersion + 1 : 1));
};


// -------------------------------------------
// Store Operation
// -------------------------------------------
export namespace $Store {
    export interface Description {
        name: string;
        autoIncrement?: boolean;
        keyPath?: IDBKeyPath;
        indexes?: $Index.Description[];
    }

    export function creator(db: IDBDatabase) {
        return (name: string, desc: Description) => {
            const { keyPath, autoIncrement = false, indexes = [] } = desc;
            const store = db.createObjectStore(name, { keyPath, autoIncrement });
            $Index.updateStoreIndexs(store, indexes);
        };
    }

    export function updater(trx: IDBTransaction) {
        return (name: string, desc: Description) => {
            const { indexes = [] } = desc;
            const store = trx.objectStore(name);
            $Index.updateStoreIndexs(store, indexes);
        };
    }

    export function deleter(db: IDBDatabase, trx: IDBTransaction) {
        return (name: string, done: (name: string, record: any[]) => any, opt: { backup: boolean }) => {
            if (!opt.backup) {
                db.deleteObjectStore(name);
                done(name, []);
                return;
            }

            const record: any[] = [];
            const req = trx.objectStore(name).openCursor();
            req.addEventListener('success', getAll);

            function getAll(this: IDBRequest) {
                const cursor: IDBCursorWithValue = this.result;
                if (cursor) {
                    record.push(cursor.value);
                    cursor.continue();
                } else {
                    db.deleteObjectStore(name);
                    done(name, record);
                }
            }
        };
    }
}

// -------------------------------------------
// Index Oepration
// -------------------------------------------
export namespace $Index {
    export interface Description {
        keyPath: string | string[];
        as?: string;
        multiEntry?: boolean;
        unique?: boolean;
    }

    export function parse(val: string | string[]) {
        return Array.isArray(val) ? val.join('.') : val;
    }

    export function getName(desc: Description) {
        return _.has(desc, 'as') ? desc.as! : parse(desc.keyPath);
    }

    export function createIndex(store: IDBObjectStore) {
        return (name: string) => store.createIndex(name, name);
    }

    export function deleteIndex(store: IDBObjectStore) {
        return (name: string) => store.deleteIndex(name);
    }

    export function updateStoreIndexs(store: IDBObjectStore, descs: Description[]) {
        const names = {
            exists: Array.from(store.indexNames),
            desced: descs.map(getName),
        };

        _.difference(names.desced, names.exists).forEach(createIndex(store));
        _.difference(names.exists, names.desced).forEach(deleteIndex(store));
    }
}
