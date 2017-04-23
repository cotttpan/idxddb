import * as assert from 'assert';
import { IdxdDB } from './../../src/idxddb';
import { Stores, createDB } from './../test-helper';

describe('#version / #open / #close / #delete', () => {
    let db: IdxdDB<Stores>;
    before(createDB((d) => db = d));
    after(() => db.delete());

    it('created database with schema and open with latest version', () => {
        db.once('ready', () => {
            assert.equal(db.isOpen, true);
            assert.equal(db.currentVersion, 2);
            assert.deepEqual(db.db.objectStoreNames, ['storeA', 'storeB']);
            db.close();
            assert.equal(db.isOpen, false);
        });
    });
});
