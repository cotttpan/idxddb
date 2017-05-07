export declare type VersionMap = Map<number, VersionUpdateInfo>;
export interface VersionUpdateInfo {
    schema: Schema;
    rescue?: RescueFunction<any>;
}
export declare type Schema = $Store.Description[];
export declare type RescueFunction<T> = (lostdata: Partial<T>) => any;
export declare type IndexDescription = $Index.Description;
export declare type StoreDescription = $Store.Description;
export declare const onsuccess: (tap: (idb: IDBDatabase) => any) => (this: IDBRequest) => void;
export declare const onerror: (tap: (error: DOMError) => any) => (this: IDBRequest) => void;
export declare const onupgradeneeded: (versionMap: Map<number, VersionUpdateInfo>) => (this: IDBOpenDBRequest, ev: IDBVersionChangeEvent) => void;
export declare namespace $Store {
    interface Description {
        name: string;
        autoIncrement?: boolean;
        keyPath?: IDBKeyPath;
        indexes?: $Index.Description[];
    }
    function creator(db: IDBDatabase): (name: string, desc: Description) => void;
    function updater(trx: IDBTransaction): (name: string, desc: Description) => void;
    function deleter(db: IDBDatabase, trx: IDBTransaction): (name: string, done: (name: string, record: any[]) => any, opt: {
        backup: boolean;
    }) => void;
}
export declare namespace $Index {
    interface Description {
        keyPath: string | string[];
        as?: string;
        multiEntry?: boolean;
        unique?: boolean;
    }
    function parse(val: string | string[]): string;
    function getName(desc: Description): string;
    function createIndex(store: IDBObjectStore): (name: string) => IDBIndex;
    function deleteIndex(store: IDBObjectStore): (name: string) => void;
    function updateStoreIndexs(store: IDBObjectStore, descs: Description[]): void;
}
