export declare function trx<T>(scope: string | string[], mode: 'r' | 'rw', executor: trx.Executor<T>): (onResolve: Function, onReject: Function) => (db: IDBDatabase, KeyRange: {
    new (): IDBKeyRange;
    prototype: IDBKeyRange;
    bound(lower: any, upper: any, lowerOpen?: boolean | undefined, upperOpen?: boolean | undefined): IDBKeyRange;
    lowerBound(lower: any, open?: boolean | undefined): IDBKeyRange;
    only(value: any): IDBKeyRange;
    upperBound(upper: any, open?: boolean | undefined): IDBKeyRange;
}) => void;
export declare namespace trx {
    interface Executor<T> {
        (request: Request<T>): IterableIterator<(next: Function) => (IDBRequest | void)>;
    }
    const parseMode: (mode: "r" | "rw") => "readwrite" | "readonly";
}
export declare class Request<T> {
    protected KeyRange: typeof IDBKeyRange;
    protected trx: IDBTransaction;
    constructor(trx: IDBTransaction, KeyRange: typeof IDBKeyRange);
    abort(): () => void;
    get<K extends keyof T>(store: K, key: any): (next: Function) => IDBRequest;
    getBy<K extends keyof T>(store: K, range: Request.RangeFunction): Request.ReturnFunction;
    getBy<K extends keyof T>(store: K, index: keyof T[K] | string, range: Request.RangeFunction): Request.ReturnFunction;
    getAll<K extends keyof T>(store: K): (next: Function) => IDBRequest;
    set<K extends keyof T>(store: K, record: T[K], key?: any): (next: Function) => IDBRequest;
    delete<K extends keyof T>(store: K, key: any): (next: Function) => IDBRequest;
    deleteBy<K extends keyof T>(store: K, range: Request.RangeFunction): Request.ReturnFunction;
    deleteBy<K extends keyof T>(store: K, index: keyof T[K] | string, range: Request.RangeFunction): Request.ReturnFunction;
    clear<K extends keyof T>(store: K): (next: Function) => IDBRequest;
}
export declare namespace Request {
    type ReqEvent = Event & {
        target: {
            result: any;
        };
    };
    type RangeFunction = (keyrange: typeof IDBKeyRange) => IDBKeyRange;
    type ReturnFunction = (next: Function) => IDBRequest;
}
