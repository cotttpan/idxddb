import * as assert from 'assert';
import { IdxdDB } from './../../src/idxddb';
import { options, V1, V2, V3 } from './../test-helper';

describe('SimpleCrudApi', () => {
    let db: IdxdDB<V3.Stores>;
    before(() => new Promise(resolve => {
        db = new IdxdDB('TestDB', options)
            .version(1, V1.schema)
            .version(2, V2.schema)
            .version(3, V3.schema)
            .open();
        db.on('ready', resolve);
    }));
    after(() => db.delete());

    beforeEach(() => new Promise(resolve => {
        db.transaction(['storeA', 'storeB', 'storeC'], 'rw', function* ($) {
            for (const i of [1, 2, 3]) {
                yield $('storeA').set(V3.record.sA(i));
                yield $('storeB').set(V3.record.sB(), i);
                yield $('storeC').set(V3.record.sC(i));
            }
        }).then(resolve);
    }));

    afterEach(() => Promise.all(db.storeNames.map(x => db.store(x).clear())));

    describe('count', () => {
        it('return record count', async () => {
            const r = await db.store('storeA').count();
            assert.equal(r, 3);
        });
    });

    describe('get', () => {
        it('get record by primary key', async () => {
            const r = await db.store('storeA').get(1);
            assert.deepEqual(r, V3.record.sA(1));

            const r2 = await db.store('storeA').get(4);
            assert.equal(r2, undefined);
        });
    });

    describe('getAll', () => {
        it('return all record in the store', async () => {
            const r = await db.store('storeA').getAll();
            assert.equal(r.length, 3);
        });
    });

    describe('find', () => {
        it('get record by primary key range', async () => {
            const r = await db.store('storeA').find(range => range.only(2));
            assert.deepEqual(r, [V3.record.sA(2)]);
        });

        it('get record by index and key range', async () => {
            const r = await db.store('storeA').find('a', range => range.only(2));
            assert.deepEqual(r, [V3.record.sA(2)]);
        });
    });

    describe('set', () => {
        it('set single record', async () => {
            const record = V3.record.sA(4);
            const r = await db.store('storeA').set(record);
            assert.deepEqual(r, record);
            assert.equal(await db.store('storeA').count(), 4);
        });
    });

    describe('bulkSet?', () => {
        it('set multi record', async () => {
            const records = [V3.record.sA(4), V3.record.sA(5)];
            const r = await db.store('storeA').bulkSet(records);
            const count = await db.store('storeA').count();
            assert.equal(count, 5);
            assert.deepEqual(r, records);
        });
    });

    describe('delete', () => {
        it('delete single record by primary key', async () => {
            const r = await db.store('storeA').delete(1);
            const count = await db.store('storeA').count();
            assert.deepEqual(r, V3.record.sA(1));
            assert.equal(count, 2);
        });
    });

    describe('bulkDelete', () => {
        it('delete multi records by primary keys', async () => {
            const r = await db.store('storeA').bulkDelete([1, 2]);
            const count = await db.store('storeA').count();
            assert.deepEqual(r, [V3.record.sA(1), V3.record.sA(2)]);
            assert.equal(count, 1);
        });
    });

    describe('clear', () => {
        it('delete all records in the store', async () => {
            const r = await db.store('storeA').clear();
            const count = await db.store('storeA').count();
            assert.equal(r.length, 3);
            assert.equal(count, 0);
        });
    });
});
