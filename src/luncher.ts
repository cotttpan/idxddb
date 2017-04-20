import * as utils from './utils';

/* OpenRequestHandler
-------------------------------*/
/*
* NOTE: 安全なmigrationのideaが浮かばないため、すべてのstoreを再作成する
*/
export const onupgradeneeded = (schema: Schema) => function (this: IDBOpenDBRequest) {
    const db: IDBDatabase = this.result;
    Array.from(db.objectStoreNames).forEach(db.deleteObjectStore, db);
    schema.forEach(createStoreFromDescription(db));
};

export const onsuccess = (tap: (idb: IDBDatabase) => any) => function (this: IDBRequest) {
    tap(this.result);
};

export const onerror = (tap: (error: DOMError) => any) => function (this: IDBRequest) {
    tap(this.error);
};

export const createStoreFromDescription = (db: IDBDatabase) => {
    return (desc: StoreDescription) => {
        const { keyPath, autoIncrement = false, indexes = [] } = desc;
        const store = db.createObjectStore(desc.name, { keyPath, autoIncrement });
        indexes.forEach(createIndex(store));
    };
};

export const createIndex = (store: IDBObjectStore) => {
    return (desc: IndexDescription) => store.createIndex(indexName(desc), desc.keyPath, desc);
};

export const indexName = (desc: IndexDescription) => {
    return utils.has(desc, 'as') ? desc.as! : parseIndexName(desc.keyPath);
};

export const parseIndexName = (val: string | string[]) => {
    return Array.isArray(val) ? val.join('.') : val;
};

/* Tyeps
------------------------------ */
export type Schema = StoreDescription[];

export interface StoreDescription {
    name: string;
    autoIncrement?: boolean;
    keyPath?: IDBKeyPath;
    indexes?: IndexDescription[];
}

export interface IndexDescription {
    keyPath: string | string[];
    as?: string;
    multiEntry?: boolean;
    unique?: boolean;
}
