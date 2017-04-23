export declare type Schema = StoreDescription[];
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
export declare const onupgradeneeded: (schema: StoreDescription[]) => (this: IDBOpenDBRequest) => void;
export declare const onsuccess: (tap: (idb: IDBDatabase) => any) => (this: IDBRequest) => void;
export declare const onerror: (tap: (error: DOMError) => any) => (this: IDBRequest) => void;
export declare const createStoreFromDescription: (db: IDBDatabase) => (desc: StoreDescription) => void;
export declare const createIndex: (store: IDBObjectStore) => (desc: IndexDescription) => IDBIndex;
export declare const indexName: (desc: IndexDescription) => string;
export declare const parseIndexName: (val: string | string[]) => string;
