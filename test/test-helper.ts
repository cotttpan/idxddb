import { Schema, IdxdDB, IdxdDBOptions } from './../src/idxddb';

/* Interface and Schema
------------------------------- */
export interface StoreA {
    id?: number;
    a: string;
    nest: { b: number };
    c: boolean;
}

export interface StoreB {
    a: number;
}

export interface Stores {
    storeA: StoreA;
    storeB: StoreB;
}

export const schema: Schema = [
    // with primary key and index
    {
        name: 'storeA',
        keyPath: 'id',
        autoIncrement: true,
        indexes: [
            { keyPath: 'a' },
            { keyPath: 'nest.b', as: 'b' },
        ],
    },
    // without primary key
    {
        name: 'storeB',
        autoIncrement: true,
    },
];

/* Helper Functoins
------------------------------- */

export const options: IdxdDBOptions = {};
if (process.env.TEST_ENV === 'node') {
    options.IDBFactory = require('fake-indexeddb');
    options.IDBKeyRange = require('fake-indexeddb/lib/FDBKeyRange');
}

export const createDB = (fn: (db: IdxdDB<Stores>) => any) => () => {
    const db = new IdxdDB<Stores>('sample', options)
        .version(1, [schema[0]])
        .version(2, schema)
        .open();
    fn(db);
};

export namespace data {
    export const storeA = (id: number) => ({ id, a: `a-${id}`, nest: { b: id }, c: false });
    export const storeB = (a: number) => ({ a });
}
