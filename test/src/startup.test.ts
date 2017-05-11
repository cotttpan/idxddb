import * as assert from 'assert';
import * as sinon from 'sinon';
import { IdxdDB } from './../../src/idxddb';
import { options, V1, V2 } from './../test-helper';
import { includes } from './../../src/utils';

describe('create database', () => {
    let db: IdxdDB<V1.Stores>;
    before(() => new Promise(resolve => {
        db = new IdxdDB<V1.Stores>('TestDB', options).version(1, V1.schema).open();
        db.events.on('ready', resolve);
    }));
    after(() => db.delete());

    describe('open', () => {
        it('is opened database', () => {
            assert.equal(db.isOpen, true);
        });
    });

    describe('currentVersion', () => {
        it('has current databse version', () => {
            assert.equal(db.currentVersion, 1);
        });
    });

    describe('created stores', () => {
        it('crated stores', () => {
            assert(includes(db.storeNames, 'storeA'));
            assert(includes(db.storeNames, 'storeB'));
        });
    });

    describe('close', () => {
        it('will be to database close', () => {
            const _db = db.close();
            assert.equal(_db.isOpen, false);
        });
    });

    describe('delete', () => {
        it('delete database', () => {
            return db.delete().then(() => assert(!db.isOpen));
        });
    });
});

describe('migration - crate store', () => {
    let db: IdxdDB<V2.Stores>;
    before(() => new Promise(resolve => {
        db = new IdxdDB<V2.Stores>('TestDB', options).version(1, V1.schema).open();
        db.events.on('ready', resolve);
    }));
    after(() => db.delete());

    describe('create store', () => {
        beforeEach(() => db.close().version(2, V2.schema).open());
        it('create new store by schema', (done) => {
            db.events.once('ready', () => {
                assert.equal(db.currentVersion, 2);
                assert(includes(db.storeNames, 'storeC'));
                done();
            });
        });
    });
});

describe('migration - delete store', () => {
    let db: IdxdDB<V2.Stores>;
    const spy = sinon.spy();
    const willDeletedData = [{ a: 1 }, { a: 2 }];

    before(() => db = new IdxdDB<V2.Stores>('TestDB', options).version(1, V1.schema).open());
    after(() => db.delete());

    describe('delete', () => {
        before(() => new Promise((resolve) => {
            db.store<any>('storeB').bulkSet(willDeletedData).then(() => {
                db.close().version(2, V2.schema, spy).open();
                db.events.once('ready', resolve);
            });
        }));

        it('delete storeB by schema', () => {
            assert.equal(db.currentVersion, 2);
            assert(!includes(db.storeNames, 'storeB'));
        });

        it('can get lostdata on rescue function', () => {
            assert(spy.calledWithMatch({ storeB: willDeletedData }));
        });
    });
});

describe('migration - update store indexes', () => {
    let db: IdxdDB<V2.Stores>;
    before(() => new Promise(resolve => {
        db = new IdxdDB<V2.Stores>('TestDB', options).version(1, V1.schema).open();
        db.events.on('ready', resolve);
    }));
    after(() => db.delete());

    describe('index of storeA on v1', () => {
        it('dont have  index "c" ', () => {
            return db.transaction('storeA', 'r', function* (_, { trx }) {
                const idx = trx.objectStore('storeA').indexNames;
                assert(!idx.contains('c'));
            });
        });
    });

    describe('migrate v1 -> v2', () => {
        before(() => new Promise(resolve => {
            db.close().version(2, V2.schema).open();
            db.events.on('ready', resolve);
        }));

        it('have index "c" on storeA', () => {
            return db.transaction('storeA', 'r', function* (_, { trx }) {
                const idx = trx.objectStore('storeA').indexNames;
                assert(idx.contains('c'));
            });
        });
    });
});

describe('migration - when version v1 -> v3 at once', () => {
    const spy = sinon.spy();
    let db: IdxdDB<V2.Stores>;
    before(() => new Promise(resolve => {
        db = new IdxdDB<V2.Stores>('TestDB', options)
            .version(1, V1.schema, spy)
            .version(2, V2.schema, spy)
            .version(3, V2.schema, spy)
            .open();
        db.events.on('ready', resolve);
    }));
    after(() => db.delete());

    it('is to perform stepwise per schema of version', () => {
        assert.equal(db.currentVersion, 3);
        assert.equal(spy.callCount, 3);
    });
});
