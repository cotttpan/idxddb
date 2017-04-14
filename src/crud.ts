/*
 * # crud methodの責務
 * ------------------------
 * 1. transactionの作成
 * 2. request handling
 * 3. error handling
 *   - req.onerror
 *   - trx.onerror
 *   - trx.onabort
 * coreが提供するAPI用にeventの発行とpromiseで結果を返せる余地を残す
*/

/**
 * crud core api
 * TODO: getBy(range => {})
 * TODO: deleteBy(range => {})
 */
export type ReqHandler = (this: IDBRequest, ev: Event) => any;
export type TrxHandler = (this: IDBTransaction, ev: Event) => any;

/**
 * idb transaction抽象
 * NOTE: trx.onerrorとtrx.onabortを同じonerror handlerで受けているので変更の可能性がある
 */
export const transaction = (db: IDBDatabase, store: string, mode: 'r' | 'rw' = 'r') => {
    return (onsuccess: (store: IDBObjectStore) => any, onerror: TrxHandler) => {
        const trx = db.transaction(store, parseTrxMode(mode));
        onsuccess(trx.objectStore(store));
        trx.onabort = onerror;
        trx.onerror = onerror;
    };
};

/**
 * transaction mode parser
 */
export const parseTrxMode = (mode: 'r' | 'rw') => {
    return mode === 'rw' ? 'readwrite' : 'readonly';
};

/**
 * IDBRequestのhandling抽象
 */
export const request = (req: IDBRequest, onsuccess: ReqHandler, onerror: ReqHandler) => {
    req.onsuccess = onsuccess;
    req.onerror = onerror;
};

/**
 * get record from primary key
 */
export const get = <T, K extends keyof T>(resolve: Function, reject: Function) => {
    return (db: IDBDatabase, store: K, key: any) => {
        transaction(db, store)(
            $store => request($store.get(key), _.simple(resolve), _.reject(reject)),
            _.reject(reject)
        );
    };
};

/**
 * get all store record
 */
export const getAll = <T, K extends keyof T>(resolve: Function, reject: Function) => {
    return (db: IDBDatabase, store: K) => {
        transaction(db, store)(
            $store => request($store.openCursor(), _.matchAll(resolve), _.reject(reject)),
            _.reject(reject)
        );
    };
};

/**
 * find by index and range
 */
export const find = <T, K extends keyof T>(resolve: Function, reject: Function) => {
    return (db: IDBDatabase, store: K, index: string, range?: IDBKeyRange) => {
        transaction(db, store, 'rw')(
            $store => request(
                $store.index(index).openCursor(range),
                _.matchAll(resolve),
                _.reject(reject)
            ),
            _.reject(reject)
        );
    };
};

/**
 * set record to store
 */
export const set = <T, K extends keyof T>(resolve: Function, reject: Function) => {
    return (db: IDBDatabase, store: K, record: T[K], key?: any) => {
        transaction(db, store, 'rw')(
            $store => request($store.put(record, key), _.simple(resolve), _.reject(reject)),
            _.reject(reject)
        );
    };
};

/**
 * delete record
 * NOTE: keyにprimary keyを受け取って単一recordをdeleteすることを想定している
 */
export const del = <T, K extends keyof T>(resolve: Function, reject: Function) => {
    return (db: IDBDatabase, store: K, key: any) => {
        transaction(db, store, 'rw')(
            $store => request($store.delete(key), _.simple(resolve), _.reject(reject)),
            _.reject(reject)
        );
    };
};

/**
 * clear store records
 */
export const clear = <T, K extends keyof T>(resolve: Function, reject: Function) => {
    return (db: IDBDatabase, store: K) => {
        transaction(db, store, 'rw')(
            $store => request($store.clear(), _.simple(resolve), _.reject(reject)),
            _.reject(reject)
        );
    };
};

/**
 * crud apiのonsuccess handler(domain logic)
 */
namespace _ {
    /**
     * curd apiの共通のerror handler
     */
    export const reject = (rejectFn: Function) => function (this: IDBRequest | IDBTransaction) {
        const domerror: any = this.error;
        rejectFn(new Error(`${domerror.name}: ${domerror.message}`));
    };

    /**
     * idbrequestを単純にresolve
     * @param resolve
     */
    export const simple = (resolve: Function) => function (this: IDBRequest) {
        resolve(this.result);
    };

    /**
     * cursorでmatchしたrecordをすべて取得する
     */
    export const matchAll = (resolve: Function) => {
        const records: any[] = [];
        return function (this: IDBRequest) {
            const cursor: IDBCursorWithValue = this.result;
            if (cursor) {
                records.push(cursor.value);
                cursor.continue();
            } else {
                resolve(records);
            }
        };
    };
}
