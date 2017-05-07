import { Operation } from './operation';
export declare type Mode = 'r' | 'rw';
export declare const parseMode: (mode: Mode) => "readwrite" | "readonly";
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
export declare function create<T, K extends keyof T>(scope: K | K[], mode: Mode, executor: Executor<T>): (resolve: Function, reject: Function) => (backendApi: {
    db: IDBDatabase;
    KeyRange: {
        new (): IDBKeyRange;
        prototype: IDBKeyRange;
        bound(lower: any, upper: any, lowerOpen?: boolean | undefined, upperOpen?: boolean | undefined): IDBKeyRange;
        lowerBound(lower: any, open?: boolean | undefined): IDBKeyRange;
        only(value: any): IDBKeyRange;
        upperBound(upper: any, open?: boolean | undefined): IDBKeyRange;
    };
}, transaction?: IDBTransaction | undefined) => void;
