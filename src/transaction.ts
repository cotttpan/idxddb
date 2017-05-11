import { Operation } from './operation';

export type Mode = 'r' | 'rw';
export const parseMode = (mode: Mode) => {
    return mode === 'rw' ? 'readwrite' : 'readonly';
};

export interface AbortFunciton {
    (): () => void;
}
export interface BackendAPI {
    db: IDBDatabase;
    trx: IDBTransaction;
    KeyRange: typeof IDBKeyRange;
}
export interface Selector<T> {
    <K extends keyof T>(store: K): Operation<T, K>;
    abort: AbortFunciton;
}
export interface Executor<T> {
    // https://github.com/cotttpan/idxddb/issues/5
    (selector: Selector<T>, backendApi: BackendAPI): IterableIterator<any>;
}

/**
 * Create transaction
 *
 * @export
 * @template T - {[storeName]: Model}
 * @template K
 * @param {(K | K[])} scope
 * @param {Mode} mode
 * @param {Executor<T>} executor
 * @returns {Function}
 */
export function create<T, K extends keyof T>(scope: K | K[], mode: Mode, executor: Executor<T>) {
    return (resolve: Function, reject: Function) => (
        backendApi: { db: IDBDatabase, KeyRange: typeof IDBKeyRange },
        transaction?: IDBTransaction
    ) => {
        const trx = transaction ? transaction : backendApi.db.transaction(scope, parseMode(mode));

        const select: any = (store: K) => new Operation<T, K>(backendApi.KeyRange, trx.objectStore(store));
        select.abort = () => () => trx.abort();

        const i = executor(select, { trx, ...backendApi });

        trx.addEventListener('error', handleReject);
        trx.addEventListener('abort', handleReject);

        (function tick(value?: any) {
            const ir = i.next(value);
            ir.done ? trx.addEventListener('complete', resolve.bind(null, ir.value)) : ir.value(tick);
        }());

        function handleReject(this: IDBTransaction) {
            reject(this.error);
        }
    };
}
