import * as assert from 'assert';
import { IdxdDB } from './../../src/idxddb';
import { Stores, createDB, data } from './../test-helper';

describe('SimpleCrudApi', () => {
    let db: IdxdDB<Stores>;
    before(createDB((d) => db = d));
    after(() => db.delete());

    beforeEach(() => db.transaction(['storeA', 'storeB'], 'rw', function* ($) {
        for (const i of [1, 2, 3]) {
            yield $('storeA').set(data.storeA(i));
            yield $('storeB').set(data.storeB(i), i);
        }
    }));

    afterEach(() => Promise.all(
        db.storeNames.map(s => db.store(s).clear()),
    ));

    after(() => Promise.resolve(() => db.delete()));

    describe('count', () => {
        it('return record count', async () => {
            const r = await db.store('storeA').count();
            assert.equal(r, 3);
        });
    });

    describe('get', () => {
        it('get record by primary key', async () => {
            const r = await db.store('storeA').get(1);
            assert.deepEqual(r, data.storeA(1));

            const r2 = await db.store('storeA').get(4);
            assert.equal(r2, undefined);
        });
    });

    describe('getAll', () => {
        it('return all records in the store', async () => {
            const r = await db.store('storeA').getAll();
            assert.equal(r.length, 3);
        });
    });

    describe('find', () => {
        it('get racords by primary key range', async () => {
            const r = await db.store('storeA').find(range => range.only(1));
            assert.deepEqual(r, [data.storeA(1)]);
        });

        it('get racords by index and key range', async () => {
            const r = await db.store('storeA').find('b', range => range.only(2));
            assert.deepEqual(r, [data.storeA(2)]);
        });
    });

    describe('set', () => {
        it('set single record', async () => {
            const _r = data.storeA(4);
            const r = await db.store('storeA').set(_r);
            assert.deepEqual(r, _r);
            assert.equal(await db.store('storeA').count(), 4);
        });
    });

    describe('bulkSet', () => {
        it('set multi record', async () => {
            const _r = [data.storeA(4), data.storeA(5)];
            const r = await db.store('storeA').bulkSet(_r);
            const count = await db.store('storeA').count();

            assert.deepEqual(r, _r);
            assert.equal(count, 5);
        });
    });


    describe('delete', () => {
        it('delete single record', async () => {
            const r = await db.store('storeA').delete(1);
            const count = await db.store('storeA').count();
            assert.equal(r!.id, 1);
            assert.equal(count, 2);
        });
    });

    describe('bulkDelete', () => {
        it('delete multi record', async () => {
            const r = await db.store('storeA').bulkDelete([1, 2]);
            const count = await db.store('storeA').count();
            assert.equal(r.length, 2);
            assert.equal(count, 1);
        });
    });

    describe('clear', () => {
        it('clear store', async () => {
            const r = await db.store('storeA').clear();
            const count = await db.store('storeA').count();
            assert.equal(r.length, 3);
            assert.equal(count, 0);
        });
    });
});
