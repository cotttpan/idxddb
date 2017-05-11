"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const _ = require("./utils");
// -------------------------------------------
// API
// -------------------------------------------
exports.onsuccess = (tap) => function () {
    tap(this.result);
};
exports.onerror = (tap) => function () {
    tap(this.error);
};
exports.onupgradeneeded = (versionMap) => function (ev) {
    const db = this.result;
    const trx = this.transaction;
    const newVersion = ev.newVersion || _.last(versionMap.keys());
    const operation = {
        create: $Store.creator(db),
        update: $Store.updater(trx),
        delete: $Store.deleter(db, trx)
    };
    /*
      * 1. [createStores, updateStoresIndexes, deleteStores(with buckup)]
      * 2. wait a backup
      * 3. call rescue function
      * 4. next version migration
      */
    (function migrate(v) {
        if (v > newVersion)
            return;
        const { schema, rescue } = versionMap.get(v);
        const $schema = _.groupBy(schema, 'name');
        const sNames = {
            exists: Array.from(db.objectStoreNames),
            desced: Object.keys($schema)
        };
        const next = _.bundle(rescue || _.noop, migrate.bind(null, v + 1));
        (function __CREATE_STORE__() {
            const stores = (v === 1) ? sNames.desced : _.difference(sNames.desced, sNames.exists);
            stores.forEach(name => operation.create(name, $schema[name]));
        }());
        (function __UPDATE_STORE__() {
            const stores = (v === 1) ? sNames.desced : _.intersection(sNames.desced, sNames.exists);
            stores.forEach(name => operation.update(name, $schema[name]));
        }());
        (function __DELETE_STORE__() {
            const stores = (v === 1) ? [] : _.difference(sNames.exists, sNames.desced);
            const records = {};
            const setRecord = (name, record) => records[name] = record;
            const awaiter = _.onlyThatTime(stores.length, next.bind(null, records));
            stores.forEach(name => operation.delete(name, _.bundle(setRecord, awaiter), { backup: !!rescue }));
        }());
    }(ev.oldVersion ? ev.oldVersion + 1 : 1));
};
// -------------------------------------------
// Store Operation
// -------------------------------------------
var $Store;
(function ($Store) {
    function creator(db) {
        return (name, desc) => {
            const { keyPath, autoIncrement = false, indexes = [] } = desc;
            const store = db.createObjectStore(name, { keyPath, autoIncrement });
            $Index.updateStoreIndexs(store, indexes);
        };
    }
    $Store.creator = creator;
    function updater(trx) {
        return (name, desc) => {
            const { indexes = [] } = desc;
            const store = trx.objectStore(name);
            $Index.updateStoreIndexs(store, indexes);
        };
    }
    $Store.updater = updater;
    function deleter(db, trx) {
        return (name, done, opt) => {
            if (!opt.backup) {
                db.deleteObjectStore(name);
                done(name, []);
                return;
            }
            const record = [];
            const req = trx.objectStore(name).openCursor();
            req.addEventListener('success', getAll);
            function getAll() {
                const cursor = this.result;
                if (cursor) {
                    record.push(cursor.value);
                    cursor.continue();
                }
                else {
                    db.deleteObjectStore(name);
                    done(name, record);
                }
            }
        };
    }
    $Store.deleter = deleter;
})($Store = exports.$Store || (exports.$Store = {}));
// -------------------------------------------
// Index Oepration
// -------------------------------------------
var $Index;
(function ($Index) {
    function parse(val) {
        return Array.isArray(val) ? val.join('.') : val;
    }
    $Index.parse = parse;
    function getName(desc) {
        return _.has(desc, 'as') ? desc.as : parse(desc.keyPath);
    }
    $Index.getName = getName;
    function createIndex(store) {
        return (name) => store.createIndex(name, name);
    }
    $Index.createIndex = createIndex;
    function deleteIndex(store) {
        return (name) => store.deleteIndex(name);
    }
    $Index.deleteIndex = deleteIndex;
    function updateStoreIndexs(store, descs) {
        const names = {
            exists: Array.from(store.indexNames),
            desced: descs.map(getName)
        };
        _.difference(names.desced, names.exists).forEach(createIndex(store));
        _.difference(names.exists, names.desced).forEach(deleteIndex(store));
    }
    $Index.updateStoreIndexs = updateStoreIndexs;
})($Index = exports.$Index || (exports.$Index = {}));
//# sourceMappingURL=startup.js.map