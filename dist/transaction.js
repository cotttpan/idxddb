"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const operation_1 = require("./operation");
exports.parseMode = (mode) => {
    return mode === 'rw' ? 'readwrite' : 'readonly';
};
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
function create(scope, mode, executor) {
    return (resolve, reject) => (backendApi, transaction) => {
        const trx = transaction ? transaction : backendApi.db.transaction(scope, exports.parseMode(mode));
        const select = (store) => new operation_1.Operation(backendApi.KeyRange, trx.objectStore(store));
        select.abort = () => () => trx.abort();
        const i = executor(select, Object.assign({ trx }, backendApi));
        trx.addEventListener('error', handleReject);
        trx.addEventListener('abort', handleReject);
        (function tick(value) {
            const ir = i.next(value);
            ir.done ? trx.addEventListener('complete', resolve.bind(null, ir.value)) : ir.value(tick);
        }());
        function handleReject() {
            reject(this.error);
        }
    };
}
exports.create = create;
//# sourceMappingURL=transaction.js.map