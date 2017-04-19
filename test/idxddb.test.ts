import * as assert from 'assert';
import * as sinon from 'sinon';
import { IdxdDB, IdxdDBOptions, Schema } from './../src/idxddb';

interface ISampleStoreA {
    id?: number;
    k1: string;
    nest: {
        k2: number;
    };
}

interface ISampleStoreB {
    k1: number;
}

interface IStores {
    storeA: ISampleStoreA;
    storeB: ISampleStoreB;
}

const schema: Schema = [
    // with primary key and index
    {
        name: 'storeA',
        keyPath: 'id',
        autoIncrement: true,
        indexes: [
            { keyPath: 'k1' },
            { keyPath: 'nest.k2', as: 'k2' },
        ]
    },
    // without primary key
    {
        name: 'storeB',
        autoIncrement: true
    }
];

namespace storeA {
    export const record = (id: number) => ({ id, k1: `${id}_idx`, nest: { k2: id } });
}
namespace storeB {
    export const record = (k1: number) => ({ k1 });
}


const options: IdxdDBOptions = {};
if (process.env.TEST_ENV === 'node') {
    options.IDBFactory = require('fake-indexeddb');
    options.IDBKeyRange = require('fake-indexeddb/lib/FDBKeyRange');
}

describe('#version / #open / #close', () => {
    it('created database with schema and open with latest version', () => {
        const $db = new IdxdDB<any>('sample', options)
            .version(1, [schema[0]])
            .version(2, schema)
            .open();

        $db.on('ready', () => {
            assert.equal($db.isOpen, true);
            assert.equal($db.currentVersion, 2);
            assert.deepEqual($db.backendDB.objectStoreNames, ['storeA', 'storeB']);
            $db.close();
            assert.equal($db.isOpen, false);

            $db.deleteDatabase();
        });
    });
});


describe('crud', () => {
    const $db = new IdxdDB<IStores>('sample2', options)
        .version(1, schema)
        .open();

    afterEach(() => {
        return new Promise(resolve => {
            $db.storeNames.forEach((store) => {
                $db.clear(store as any).then(resolve);
            });
        });
    });

    describe('#transaction', () => {
        it('creating transaction and execute request', async () => {
            const [sa, sb] = await $db.transaction(['storeA', 'storeB'], 'rw', function* (req) {
                const r1 = yield req.set('storeA', storeA.record(1));
                assert.deepEqual(r1, storeA.record(1));

                const r2 = yield req.set('storeB', { k1: 1 }, 1);
                assert.deepEqual(r2, storeB.record(1));

                const _sa = yield req.getAll('storeA');
                const _sb = yield req.getAll('storeB');
                return [_sa, _sb];
            });

            assert.deepEqual(sa, [storeA.record(1)]);
            assert.deepEqual(sb, [storeB.record(1)]);
        });


        it('can aborting to rollback', async () => {
            const spy = sinon.spy();

            try {
                await $db.transaction(['storeA'], 'rw', function* (req) {
                    yield req.set('storeA', storeA.record(1));
                    yield req.abort();
                    yield req.set('storeA', storeA.record(2));
                });
            } catch (e) {
                spy();
            }

            const records = await $db.getAll('storeA');
            assert.deepEqual(records, []);
            assert(spy.called);
        });
    });

    describe('#get', () => {
        it('get single record by primary key', async () => {
            await $db.set('storeA', storeA.record(1));
            await $db.set('storeB', storeB.record(1), 1);

            const r1 = await $db.get('storeA', 1);
            const r2 = await $db.get('storeB', 1);

            assert.deepEqual(r1, storeA.record(1));
            assert.deepEqual(r2, storeB.record(1));
        });
    });

    describe('#getBy', () => {
        const recs = [1, 2, 3].map(storeA.record);
        beforeEach(() => {
            return $db.bulkSet('storeA', recs);
        });

        it('get records by key range', async () => {
            const rs = await $db.getBy('storeA', range => range.bound(1, 2));
            assert.deepEqual(rs, [recs[0], recs[1]]);
        });

        it('get records by index and key range', async () => {
            const rs = await $db.getBy('storeA', 'k2', range => range.upperBound(2));
            assert.deepEqual(rs, [recs[0], recs[1]]);
        });
    });

    describe('#getAll', () => {
        it('get all record in the store', async () => {
            for (let i = 0; i < 3; i++) {
                await $db.set('storeA', storeA.record(i));
            }
            const r = await $db.getAll('storeA');
            assert.equal(r.length, 3);
        });
    });

    describe('#set', () => {
        it('set single record', async () => {
            const r1 = await $db.set('storeA', storeA.record(1));
            const r2 = await $db.set('storeB', storeB.record(1), 1);
            assert.deepEqual(r1, storeA.record(1));
            assert.deepEqual(r2, storeB.record(1));
        });
    });

    describe('#bulkSet', () => {
        it('set multi record', async () => {
            const recs = [1, 2, 3].map(storeA.record);
            const r = await $db.bulkSet('storeA', recs);
            assert.deepEqual(r, recs);
        });
    });

    describe('#delete', () => {
        it('delete single record by primary key and return deleted record', async () => {
            const key = 1;
            const rec = storeA.record(key);
            await $db.set('storeA', rec);
            const r = await $db.delete('storeA', key);
            const all = await $db.getAll('storeA');
            assert.deepEqual(r, rec);
            assert.deepEqual(all, []);
        });
    });

    describe('#deleteBy', () => {
        const recs = [1, 2, 3].map(storeA.record);
        beforeEach(() => $db.bulkSet('storeA', recs));

        it('delete records by key range ', async () => {
            const deleted = await $db.deleteBy('storeA', range => range.bound(1, 2));
            assert.deepEqual(deleted, [recs[0], recs[1]]);
            const rest = await $db.getAll('storeA');
            assert.deepEqual(rest, [recs[2]]);
        });

        it('delete record by index and key range', async () => {
            const deleted = await $db.deleteBy('storeA', 'k2', range => range.upperBound(2));
            assert.equal(deleted.length, 2);
            const rest = await $db.getAll('storeA');
            assert.equal(rest.length, 1);
        });
    });

    describe('#bulkDelete', () => {
        const recs = [1, 2, 3].map(storeA.record);
        beforeEach(() => $db.bulkSet('storeA', recs));

        it('delete multi record by keys and return deleted records', async () => {
            const rs = await $db.getAll('storeA');
            assert.equal(rs.length, 3);

            const deleted = await $db.bulkDelete('storeA', [1, 2, 3]);
            assert.equal(deleted.length, 3);

            const rs2 = await $db.getAll('storeA');
            assert.equal(rs2.length, 0);
        });
    });

    describe('#clear', () => {
        const recs = [1, 2, 3].map(storeA.record);
        beforeEach(() => $db.bulkSet('storeA', recs));

        it('delete all store record', async () => {
            const deleted = await $db.clear('storeA');
            assert.equal(deleted.length, 3);

            const rs = await $db.getAll('storeA');
            assert.equal(rs.length, 0);
        });
    });
});

