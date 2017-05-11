import * as assert from 'assert';
import * as sinon from 'sinon';
import { IdxdDB } from './../../src/idxddb';
import { options, V1, V2, V3 } from './../test-helper';

describe('transaction/operation', () => {
    let db: IdxdDB<V3.Stores>;
    before(() => new Promise(resolve => {
        db = new IdxdDB('TestDB', options)
            .version(1, V1.schema)
            .version(2, V2.schema)
            .version(3, V3.schema)
            .open();
        db.events.on('ready', resolve);
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
        it('get record count', async () => {
            const count = await db.transaction(db.storeNames, 'r', function* ($) {
                const a = yield $('storeA').count();
                const b = yield $('storeB').count();
                const c = yield $('storeC').count();
                return [a, b, c];
            });
            assert.deepEqual(count, [3, 3, 3]);
        });
    });

    describe('get', () => {
        it('get single record by primary key', async () => {
            const [a, b] = await db.transaction(db.storeNames, 'r', function* ($) {
                const r1 = yield $('storeA').get(1);
                const r2 = yield $('storeB').get(1);
                return [r1, r2];
            });

            assert.deepEqual(a, V3.record.sA(1));
            assert.deepEqual(b, V3.record.sB());
        });
    });

    describe('getAll', () => {
        it('get all record in the store', async () => {
            const [a, b] = await db.transaction(db.storeNames, 'r', function* ($) {
                const r1 = yield $('storeA').getAll();
                const r2 = yield $('storeB').getAll();
                return [r1, r2];
            });

            assert.equal(a.length, 3);
            assert.equal(b.length, 3);
        });
    });

    describe('set', () => {
        it('set single record', async () => {
            const [a, b, len] = await db.transaction(db.storeNames, 'rw', function* ($) {
                const rA = yield $('storeA').set(V3.record.sA(4));
                const rB = yield $('storeB').set(V3.record.sB(), 4);
                const l = yield $('storeA').getAll();
                return [rA, rB, l.length];
            });

            assert.deepEqual(a, V3.record.sA(4));
            assert.deepEqual(b, V3.record.sB());
            assert.equal(len, 4);
        });
    });

    describe('delete', () => {
        it('delete single record by primary key', async () => {
            const [a, b, l1, l2] = await db.transaction(['storeA', 'storeB'], 'rw', function* ($) {
                const r1 = yield $('storeA').delete(1);
                const r2 = yield $('storeB').delete(1);
                const r3 = yield $('storeA').getAll();
                const r4 = yield $('storeB').getAll();
                return [r1, r2, r3.length, r4.length];
            });

            assert.deepEqual(a, V3.record.sA(1)); // delete record
            assert.deepEqual(b, V3.record.sB()); // delete record
            assert.equal(l1, 2);
            assert.equal(l2, 2);
        });
    });

    describe('clear', () => {
        it('delete all record', async () => {
            const [a, b, l1, l2] = await db.transaction(['storeA', 'storeB'], 'rw', function* ($) {
                const r1 = yield $('storeA').clear();
                const r2 = yield $('storeB').clear();
                const r3 = yield $('storeA').getAll();
                const r4 = yield $('storeB').getAll();
                return [r1, r2, r3.length, r4.length];
            });

            assert.equal(a.length, 3); // delete records
            assert.equal(b.length, 3); // delete records
            assert.equal(l1, 0);
            assert.equal(l2, 0);
        });
    });

    describe('find', () => {
        it('get records by primary key range', async () => {
            const r = await db.transaction('storeA', 'r', function* ($) {
                return yield $('storeA').find(range => range.bound(1, 2)).toArray();
            });
            assert.equal(r.length, 2);
            assert.deepEqual(r.map((x) => x.id), [1, 2]);
        });

        it('get records by index and key range', async () => {
            const r = await db.transaction('storeA', 'r', function* ($) {
                return yield $('storeA').find('a', range => range.bound(2, 3)).toArray();
            });
            assert.equal(r.length, 2);
            assert.deepEqual(r.map(x => x.id), [2, 3]);
        });
    });

    describe('FindPhase - (filter|map) -> toArray', () => {
        it('return filtered records', async () => {
            const r = await db.transaction('storeA', 'r', function* ($) {
                return yield $('storeA').find('a').filter(x => x.id! >= 2).toArray();
            });

            assert.equal(r.length, 2);
            assert.deepEqual(r.map(x => x.id), [2, 3]);
        });

        it('return mapped records', async () => {
            const r = await db.transaction('storeA', 'r', function* ($) {
                return yield $('storeA').find('a').map(x => x.id).toArray();
            });

            assert.equal(r.length, 3);
            assert.deepEqual(r, [1, 2, 3]);
        });
    });

    describe('FindPhase - each', () => {
        it('call function with each record and return records', async () => {
            const spy = sinon.spy();
            const r = await db.transaction('storeA', 'r', function* ($) {
                return yield $('storeA').find('a').map(x => x.id).each(spy);
            });

            assert.deepEqual(r, [1, 2, 3]);
            assert(spy.callCount === 3);
            assert(spy.firstCall.calledWith(1));
            assert(spy.secondCall.calledWith(2));
            assert(spy.thirdCall.calledWith(3));
        });
    });

    describe('FindPhase - batch.delete', () => {
        it('delete matched records', async () => {
            const [deleted, all] = await db.transaction('storeA', 'rw', function* ($) {
                const _deleted = yield $('storeA').find('a', range => range.bound(1, 2)).batch('delete');
                const _all = yield $('storeA').getAll();
                return [_deleted, _all];
            });

            assert.deepEqual(deleted.length, 2);
            assert.deepEqual(all, [V3.record.sA(3)]);
        });
    });

    describe('FindPhase - batch.update', () => {
        it('update matched record', async () => {
            const [updated, all] = await db.transaction('storeA', 'rw', function* ($) {
                const _updated = yield $('storeA').find('a')
                    .filter((x) => x.id! >= 2).batch('update', (record) => {
                        return { ...record, b: { c: true } };
                    });
                const _all = yield $('storeA').getAll();
                return [_updated, _all];
            });

            updated.forEach(x => assert.equal(x.b.c, true));
            assert.equal(all.filter(x => x.b.c === false).length, 1);
        });
    });

    describe('abort', () => {
        it('can rollback transaction', async () => {
            const spy = sinon.spy();
            try {
                await db.transaction(['storeA'], 'rw', function* ($) {
                    yield $('storeA').set(V3.record.sA(4));
                    yield $.abort();
                    yield $('storeA').set(V3.record.sA(5));
                });
            } catch (e) {
                spy();
            } finally {
                const records = await db.transaction(['storeA'], 'r', function* ($) {
                    return yield $('storeA').getAll();
                });
                assert.equal(records.length, 3);
                assert(spy.called);
            }
        });
    });
});
