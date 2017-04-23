import * as assert from 'assert';
import * as sinon from 'sinon';
import { IdxdDB } from './../../src/idxddb';
import { Stores, createDB, data } from './../test-helper';


describe('transaction/operation', () => {
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

    describe('count', () => {
        it('get record count', async () => {
            const count = await db.transaction('storeA', 'r', function* ($) {
                return yield $('storeA').count();
            });
            assert.equal(count, 3);
        });
    });


    describe('get', () => {
        it('get single record by primary key', async () => {
            const [a, b] = await db.transaction(['storeA', 'storeB'], 'r', function* ($) {
                const r1 = yield $('storeA').get(1);
                const r2 = yield $('storeB').get(1);
                return [r1, r2];
            });

            assert.deepEqual(a, data.storeA(1));
            assert.deepEqual(b, data.storeB(1));
        });
    });

    describe('getAll', () => {
        it('get all record in the store', async () => {
            const [a, b] = await db.transaction(['storeA', 'storeB'], 'r', function* ($) {
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
            const [a, b, len] = await db.transaction(['storeA', 'storeB'], 'rw', function* ($) {
                const r1 = yield $('storeA').set(data.storeA(4));
                const r2 = yield $('storeB').set(data.storeB(4), 4);
                const r3 = yield $('storeA').getAll();
                return [r1, r2, r3.length];
            });

            assert.deepEqual(a, data.storeA(4));
            assert.deepEqual(b, data.storeB(4));
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

            assert.deepEqual(a, data.storeA(1)); // delete record
            assert.deepEqual(b, data.storeB(1)); // delete record
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

        it('get records index and key range', async () => {
            const r = await db.transaction('storeA', 'r', function* ($) {
                return yield $('storeA').find('b', range => range.bound(2, 3)).toArray();
            });
            assert.equal(r.length, 2);
            assert.deepEqual(r.map(x => x.id), [2, 3]);
        });
    });

    describe('find + FindPhase', () => {
        describe('filter / map + toArray', () => {
            it('return filtered records', async () => {
                const r = await db.transaction('storeA', 'r', function* ($) {
                    return yield $('storeA').find('b').filter(x => x.id! >= 2).toArray();
                });

                assert.equal(r.length, 2);
                assert.deepEqual(r.map(x => x.id), [2, 3]);
            });

            it('return mapped records', async () => {
                const r = await db.transaction('storeA', 'r', function* ($) {
                    return yield $('storeA').find('b').map(x => x.id).toArray();
                });

                assert.equal(r.length, 3);
                assert.deepEqual(r, [1, 2, 3]);
            });
        });

        describe('forEach', () => {
            it('call function with each record and return records', async () => {
                const spy = sinon.spy();
                const r = await db.transaction('storeA', 'r', function* ($) {
                    return yield $('storeA').find('b')
                        .map(x => x.id)
                        .each(spy);
                });

                assert.deepEqual(r, [1, 2, 3]);
                assert(spy.callCount === 3);
                assert(spy.firstCall.calledWith(1));
                assert(spy.secondCall.calledWith(2));
                assert(spy.thirdCall.calledWith(3));
            });
        });

        describe('batch.delete', () => {
            it('delete matched records', async () => {
                const [deleted, all] = await db.transaction('storeA', 'rw', function* ($) {
                    const _deleted = yield $('storeA').find('b', range => range.bound(1, 2)).batch('delete');
                    const _all = yield $('storeA').getAll();
                    return [_deleted, _all];
                });
                assert.deepEqual(deleted.length, 2);
                assert.deepEqual(all, [data.storeA(3)]);
            });
        });

        describe('batch.update', () => {
            it('update matched record', async () => {
                const [updated, all] = await db.transaction('storeA', 'rw', function* ($) {
                    const _updated = yield $('storeA').find('b')
                        .filter((x) => x.id! >= 2)
                        .batch('update', (record) => {
                            return { ...record, c: true };
                        });
                    const _all = yield $('storeA').getAll();
                    return [_updated, _all];
                });

                updated.forEach(x => assert.equal(x.c, true));
                assert.equal(all.filter(x => x.c === false).length, 1);
            });
        });
    });

    describe('abort', () => {
        it('can rollback transaction', async () => {
            const spy = sinon.spy();
            try {
                await db.transaction(['storeA'], 'rw', function* ($) {
                    yield $('storeA').set(data.storeA(4));
                    yield $.abort();
                    yield $('storeA').set(data.storeA(5));
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
