import { IdxdDBOptions } from './../src/idxddb';

/* Interface and Schema
------------------------------- */
export namespace V1 {
    export interface StoreA {
        id?: number;
        a: number;
    }
    export interface StoreB {
        a: number;
    }
    export interface Stores {
        storeA: StoreA;
        storeB: StoreB;
    }
    export const schema = [
        {
            name: 'storeA',
            keyPath: 'id',
            autoIncrement: true,
            indexes: [
                { keyPath: 'a' },
            ],
        },
        {   // out-of-line key
            name: 'storeB',
            autoIncrement: true,
        },
    ];
}

export namespace V2 {
    export interface StoreA extends V1.StoreA {
        b: {
            c: boolean;
        };
    }
    export interface StoreC {
        id?: number;
        a: { b: boolean };
    }
    export interface Stores {
        storeA: StoreA;
        storeC: StoreC;
    }

    export const schema = [
        {
            name: 'storeA',
            keyPath: 'id',
            autoIncrement: true,
            indexes: [
                { keyPath: 'a' },
                { keyPath: 'b.c', as: 'c' }, // new index
            ],
        },
        {
            name: 'storeC',
            keyPath: 'id',
            autoIncrement: true,
            indexes: [
                { keyPath: 'a.b', as: 'b' }, // nested index
            ],
        },
    ];
}

export namespace V3 {
    export interface Stores {
        storeA: V2.StoreA;
        storeB: V1.StoreB;
        storeC: V2.StoreC;
    }
    export const schema = [
        ...V2.schema,
        {   // out-of-line key
            name: 'storeB',
            autoIncrement: true,
        },
    ];
    export const record = {
        sA(id: number): Stores['storeA'] {
            return {
                id,
                a: id,
                b: {
                    c: false,
                },
            };
        },
        sB(): Stores['storeB'] {
            return {
                a: 1,
            };
        },
        sC(id: number): Stores['storeC'] {
            return {
                id,
                a: {
                    b: false,
                },
            };
        },
    };
}

/* options
------------------------------- */
export const options: IdxdDBOptions = {};
if (process.env.TEST_ENV === 'node') {
    options.IDBFactory = require('fake-indexeddb');
    options.IDBKeyRange = require('fake-indexeddb/lib/FDBKeyRange');
}
