import { IdxdDB } from './idxddb';
import { Operation } from './operation';

export type Mode = 'r' | 'rw';
export const parseMode = (mode: Mode) => {
    return mode === 'rw' ? 'readwrite' : 'readonly';
};
export interface Selector<T> {
    <K extends keyof T>(store: K): Operation<T, K>;
}
export interface AbortFunciton {
    (): () => void;
}
export interface Executor<T> {
    (selector: Selector<T> & { abort: AbortFunciton }): IterableIterator<any>;
}

export function create<T, K extends keyof T>(scope: K | K[], mode: Mode, executor: Executor<T>) {
    return (resolve: Function, reject: Function) => (self: IdxdDB<T>) => {

        const trx = self.db.transaction(scope, parseMode(mode));
        const select = (store: K) => new Operation<T, K>(self, trx.objectStore(store));
        const abort = () => () => trx.abort();
        const i = executor(Object.assign(select, { abort }));

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
