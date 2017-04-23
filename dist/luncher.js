"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const utils = require("./utils");
/*
* NOTE: 安全なmigrationのideaが浮かばないため、すべてのstoreを再作成する
*/
exports.onupgradeneeded = (schema) => function () {
    const db = this.result;
    Array.from(db.objectStoreNames).forEach(db.deleteObjectStore, db);
    schema.forEach(exports.createStoreFromDescription(db));
};
exports.onsuccess = (tap) => function () {
    tap(this.result);
};
exports.onerror = (tap) => function () {
    tap(this.error);
};
exports.createStoreFromDescription = (db) => {
    return (desc) => {
        const { keyPath, autoIncrement = false, indexes = [] } = desc;
        const store = db.createObjectStore(desc.name, { keyPath, autoIncrement });
        indexes.forEach(exports.createIndex(store));
    };
};
exports.createIndex = (store) => {
    return (desc) => store.createIndex(exports.indexName(desc), desc.keyPath, desc);
};
exports.indexName = (desc) => {
    return utils.has(desc, 'as') ? desc.as : exports.parseIndexName(desc.keyPath);
};
exports.parseIndexName = (val) => {
    return Array.isArray(val) ? val.join('.') : val;
};
//# sourceMappingURL=luncher.js.map