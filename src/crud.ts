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
 * TODO: deta取得methodの拡充(indexからとか)
 */
export namespace CrudApi {
    /**
     * idb transaction抽象
     * NOTE: trx.onerrorとtrx.onabortを同じonerror handlerで受けているので変更の可能性がある
     */
    export const transaction = (db: IDBDatabase, storeName: string, mode: 'r' | 'rw' = 'r') => {
        return (onsuccess: (store: IDBObjectStore) => any, onerror: TrxHandler) => {
            const trx = db.transaction(storeName, parseTrxMode(mode));
            onsuccess(trx.objectStore(storeName));
            trx.onabort = onerror;
            trx.onerror = onerror;
        };
    };

    /**
     * get record from primary key
     */
    export const get = <T, K extends keyof T>(db: IDBDatabase, storeName: K, key: any) => {
        return new Promise<T[K] | undefined>((resolve, reject) => {
            transaction(db, storeName)(
                store => handleReq(reaction.simple(resolve), reaction.reject(reject))(store.get(key)),
                reaction.reject(reject)
            );
        });
    };

    /**
     * get all store record
     */
    export const getAll = <T, K extends keyof T>(db: IDBDatabase, storeName: K) => {
        return new Promise<T[K][]>((resolve, reject) => {
            transaction(db, storeName)(
                store => handleReq(reaction.matchAll(resolve), reaction.reject(reject))(store.openCursor()),
                reaction.reject(reject)
            );
        });
    };

    export const find = <T, K extends keyof T>(db: IDBDatabase, storeName: K, index: string, range?: IDBKeyRange) => {
        return new Promise<T[K][] | undefined>((resolve, reject) => {
            transaction(db, storeName)(
                store => handleReq(reaction.matchAll(resolve), reaction.reject(reject))(store.index(index).openCursor(range)),
                reaction.reject(reject)
            );
        });
    };

    /**
     * set record to store
     */
    export const set = <T, K extends keyof T>(db: IDBDatabase, storeName: K, record: T[K], key?: any) => {
        return new Promise<T[K]>((resolve, reject) => {
            transaction(db, storeName, 'rw')(
                store => handleReq(reaction.simple(resolve), reaction.reject(reject))(store.put(record, key)),
                reaction.reject(reject)
            );
        }).then((k: any) => get<T, K>(db, storeName, k));
    };

    /**
     * delete record
     * NOTE: keyにprimary keyを受け取って単一recordをdeleteすることを想定している
     * TODO: delete from KeyRange
     */
    export const del = <T, K extends keyof T>(db: IDBDatabase, storeName: K, key: any) => {
        let record: T[K] | undefined;
        const _del = () => new Promise<any>((resolve, reject) => {
            transaction(db, storeName, 'rw')(
                store => handleReq(reaction.simple(resolve), reaction.reject(reject))(store.delete(key)),
                reaction.reject(reject)
            );
        });
        return get<T, K>(db, storeName, key)
            .then(r => record = r)
            .then(_del)
            .then(() => record); // return Promise<deleted record>
    };
}

/**
 * crud apiのonsuccess handler(domain logic)
 */
namespace reaction {
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

/**
 * transaction mode parser
 */
export const parseTrxMode = (mode: 'r' | 'rw') => {
    return mode === 'rw' ? 'readwrite' : 'readonly';
};

/**
 * IDBRequestのhandling抽象
 */
export const handleReq = (onsuccess: ReqHandler, onerror: ReqHandler) => {
    return (req: IDBRequest) => {
        req.onsuccess = onsuccess;
        req.onerror = onerror;
    };
};

export type ReqHandler = (this: IDBRequest, ev: Event) => any;
export type TrxHandler = (this: IDBTransaction, ev: Event) => any;
