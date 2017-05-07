# IdxdDB

IndexdDB wrapper

## Install

```
npm i idxddb
```

https://www.npmjs.com/package/idxddb

## How to Use

### Create Store by schema and open Database

```js
import IdxdDB from 'idxddb';

const schema = [
    {
        name: 'books',
        keyPath: 'id',
        autoIncrement: true;
        indexes: [
            { keyPath: 'info.title', as: 'title' }
        ]
    }
]

const db = new IdxdDB('DatabaseName')
    .version(1, schema)
    .open()
```

### CRUD operation example

Operating has two way that simple store operation API and Transaction API that create it explicitly.

#### Simple Operation

Simple Operation execute one transaction and one operation to one store.

```js
// set record
db.store('books').set({id: 1, info: { title: 'MyBook' }})

// get record by primary key
db.store('books').get(1)

// find by key range of primary key
db.store('books').find(range => range.bound(1, 100))
```

#### Create Transaction explicitly

Transaction API can execute one transaction and multi operation to multi store by operator.

It can `rollback` when transaction has error or you call `abort()`.

There are two modes of `r` and `rw` at Transaction API. `r` is readonly, `rw` is readwrite. There modes are just a shorthand of IDBTransaction mode.

```js
db.transaction(['books', 'users'], 'rw', function* ($) {
    // WARN: selector "$" must need to call with a "yeild" keyword.
    const books = yield $('books').getAll()
    const users = yield $('users').getAll()
    return [books, users]
})
```

Transaction API can also more efficiently data retrieval than simple operation api.

```js
db.transaction(['users'], 'r', function* ($) {
    return yield $('users').find('age', range => range.bound(20, 50))
        .filter((user) => (/^a/i).test(user.name))
        .toArray()
})
```

## API

### Schema Interface

```js
type Schema = StoreDescription[];

interface StoreDescription {
    name: string;
    autoIncrement?: boolean;
    keyPath?: string;
    indexes?: IndexDescription[];
}

interface IndexDescription {
    keyPath: string | string[];
    as?: string;
    multiEntry?: boolean;
    unique?: boolean;
}

////////// Example //////////////
const schama = [
    /*
    interface UserModel {
        id?: number;
        name: string;
        age: number;
    }
    */
    {
        name: 'users',
        keyPath: 'id',
        autoIncrement: true,
        indexes: [
            { keyPath: 'name'},
            { keyPath: 'age' }
        ]
    },
    /*
    interface BookModel {
        id?: number;
        info: {
            title: string
        }
    }
    */
    {
        name: 'books',
        keyPath: 'id',
        autoIncrement: true;
        indexes: [
            // index in nested property
            { keyPath: 'info.title', as: 'title' }
        ]
    }
]
```

### Simple CRUD API

```js
/**
 * Get record count.
 *
 * @example
 * db.store('books').count()
 *
 */
count(): Promise<number>;

/**
 * Get record by primary key
 *
 * @example
 * db.store('books').get(1)
 *
 */
get(key: any): Promise<T[K] | undefined>;

/**
 * Get all record in the store.
 *
 * @example
 * db.store('books').getAll()
 *
 */
getAll(): Promise<T[K][]>;

/**
 * Find record by key range of primary key or by index + key range.
 *
 * @example
 * // key range of primary key
 * db.store('books').find(range => range.bound(1, 100))
 *
 * @example
 * // key range of index
 * db.store('books').find('page', range => range.bound(200, 500))
 */
find(range: RangeFunction): Promise<T[K][]>;
find(index: keyof T[K] | string, range?: RangeFunction): Promise<T[K][]>;

/**
 * Set record.
 * This method is executed by IDBDatabase.put().
 *
 * @example
 * db.store('books').set({ title: 'MyBook', page: 300 })
 *
 */
set(record: T[K], key?: any): Promise<T[K]>;

/**
 * Set multi records.
 *
 * @example
 * db.store('books').bulkSet([{ id: 1, title: 'MyBook1' }, { id: 2, title: 'MyBook2' }])
 */
bulkSet(records: T[K][]): Promise<T[K][]>;

/**
 * Delete record by primary key.
 *
 * @example
 * db.store('books').delete(1)
 *
 */
delete(key: any): Promise<T[K] | undefined>;

/**
 * Delete multi records by primary keys.
 *
 * @example
 * db.store('books').bulkDelete([1, 2, 3])
 *
 */
bulkDelete(keys: any[]): Promise<T[K][]>;

/**
 * Delete All records in the store.
 *
 * @example
 * db.store('books').clear()
 *
 */
clear(): Promise<T[K][]>;
```

### Transaction API

```js
/**
 * Create transaction explicitly and execute it.
 * Transaction can rollback when you call abort().
 *
 * @example
 * db.transaction('books', 'r', function*($) {
 *    yield $('books').set({ id: 1, title: 'MyBook', page: 10 })
 *    return yield $('books').getAll()
 * })
 *
 */
transaction<K extends keyof T>(scope: K | K[], mode: Mode, executor: Executor<T>): Promise<any>;

// ------------------------
// types
// ------------------------
type Mode = 'r' | 'rw';

interface AbortFunciton {
    (): () => void;
}

interface BackendAPI {
    db: IDBDatabase;
    trx: IDBTransaction;
    KeyRange: typeof IDBKeyRange;
}

interface Selector<T> {
    <K extends keyof T>(store: K): Operation<T, K>;
    abort: AbortFunciton;
}

interface Executor<T> {
    (selector: Selector<T>, backendApi: BackendAPI): IterableIterator<any>;
}
```

```js
/**
 * Get record count
 *
 * @example
 * db.transaction('store', 'r', function* ($){
 *   const count: number = yield $('store').count()
 * })
 *
 */
count<T, K extends keyof T>(this: Operation<T, K>): (next: Function) => IDBRequest;

/**
 * Get record by primary key.
 *
 * @example
 * db.transaction('store', 'r', function* ($){
 *   const record = yield $('store').get(1)
 *   return record // record or undefined
 * })
 *
 */
get<T, K extends keyof T>(this: Operation<T, K>, key: any): (next: Function) => IDBRequest;

/**
 * Get All records in the store.
 *
 * @example
 * db.transaction('store', 'r', function* ($){
 *   const records = yield $('store').getAll()
 * })
 */
getAll<T, K extends keyof T>(this: Operation<T, K>): (next: Function) => IDBRequest;

/**
 * Set record
 *
 * @example
 * db.transaction('store', 'rw', function* ($) {
 *   const record = yield $('store').set({ id: 1 })
 *   return record // saved record
 * })
 *
 */
set<T, K extends keyof T>(this: Operation<T, K>, records: T[K], key?: any): (next: Function) => IDBRequest;

/**
 * Delete record by primary key.
 * This function named 'delete' in the Operation class.
 *
 * @example
 * db.transaction('store', 'rw', function* ($){
 *   const record = yield $('store').delete(1)
 *   return record // deleted record or undefined
 * })
 *
 */
del<T, K extends keyof T>(this: Operation<T, K>, key: any): (next: Function) => IDBRequest;

/**
 * Clear records in the store.
 *
 * @example
 * db.transaction('store', 'rw', function* ($) {
 *   const records = yield $('store').clear()
 *   return records // deleted records
 * })
 */
clear<T, K extends keyof T>(this: Operation<T, K>): (next: Function) => IDBRequest;

/**
 * Find records by key range of primary key or by index + key range of index.
 *
 * @example
 * db.transaction('store', 'r', function* ($) {
 *   const records = yield $('store').find(range => range.bound(1, 100)).toArray()
 *   return records // finded records
 * })
 *
 * @example
 * db.transaction('store', 'r', function* ($) {
 *   const records = yield $('store').find('index', range => range.bound(1, 100)).toArray()
 *   return records // finded records
 * })
 *
 */
find<T, K extends keyof T>(this: Operation<T, K>, range: RangeFunction): FindPhase<T[K]>;
find<T, K extends keyof T>(this: Operation<T, K>, index: K | string, range?: RangeFunction): FindPhase<T[K]>;

////////////// FindPhase ////////////////
/**
 * Filter finded record.
 *
 * @example
 * db.transaction('store', 'r', function* ($) {
 *   const records = yield $('store').find(range => range.bound(1, 1000))
 *    .filter((record) => record.bool)
 *    .toArray()
 *
 *   return records // records
 * })
 *
 */
filter(predicate: (record: T) => boolean): FindPhase<T>;

/**
 * Map record to something.
 *
 * @example
 * db.transaction('store', 'r', function* ($) {
 *   const records = yield $('store').find(range => range.bound(1, 1000))
 *    .map((record) => ({ ...record, a: record.a + 1000 }))
 *    .toArray()
 *
 *   return records // records with mapped
 * })
 *
 */
map<R>(mapFn: (record: T) => R): FindPhase<R>;

/**
 * Call a function for each record.
 *
 * @example
 * db.transaction('store', 'r', function* ($) {
 *   yield $('store').find(range => range.bound(1, 100))
 *     .each((record) => doSomething(record))
 * })
 */
each<T>(this: FindPhase<T>, fn: (record: T) => any): (next: Function) => IDBRequest;

/**
 * Get finded records as Array.
 *
 * @example
 * db.transaction('store', 'r', function* ($) {
 *    return yield $('store').find(range => range.bound(1, 100)).toArray()
 * })
 */
toArray<T>(this: FindPhase<T>): (next: Function) => IDBRequest;

/**
 * Batch operation.
 * batch() can delete or update each record.
 *
 * @example
 * // delete each record
 * db.transaction('store', 'rw', function* ($) {
 *   const records = yield $('store').find(range => range.bound(1, 100))
 *     .batch('delete')
 *
 *   return records // deleted records
 * })
 *
 * @example
 * // update each record
 * db.transaction('store', 'rw', function* ($) {
 *   const records = yield $('store').find(range => range.bound(1, 100))
 *     .batch('update', (record) => ({...record, done: true }))
 *
 *   return records // updated records
 * })
 *
 */
batch<T>(this: FindPhase<T>, operation: 'delete'): (next: Function) => IDBRequest;
batch<T>(this: FindPhase<T>, operation: 'update', updater: (record: T) => T): (next: Function) => IDBRequest;
```

## Advanced

### Schema migration

```js
const v1schema = [
    {
        name: 'storeA',
        keyPath: 'id',
        autoIncrement: true,
        indexes: [
            { keyPath: 'a' },
        ],
    },
];

const v2schema = [
    ...v1schema,
    {
        name: 'storeB',
        autoIncrement: true,
    },
];

const db = new IdxdDB('MyDB')
    .version(1, v1schema)
    .version(2, v2schema)
    .open();
```

In The above example, `storeB` will be created on version 2.

Database and store will be created by the leatest version schema. IdxdDB require a complete schema in that version.

- Store will be created when schema has a new store description.
- Store will be updated when index description of the store description is changed.
- Store will be deleted when store description dose not exist.

When deleting store, records in the store is also deleted. You can get lostdata if you want.

```js

const db = new IdxdDB('MyDB')
    .version(1, v1schema)
    .version(2, v2schema, function (lostdata /*{[store]: [...record]}*/) {
        console.log(lostdata);
    })
    .open();
```

You can see more example at `test/src/startup.test.ts`.

### Testing on Node.js

```
npm i -D fake-indexeddb
```

```js
const option = {
    IDBFactory: require('fake-indexeddb'),
    IDBKeyRange: require('fake-indexeddb/lib/FDBKeyRange')
}
const db = new IdxdDB('name', option)
```


### TypeScript

```js
interface BookModel {
    id?: number;
    info: {
        title: string;
    }
}

interface Stores {
    books: BookModel;
}

const db = new IdxdDB<Stores>('DatabaseName')
    .version(1, schema)
    .open()
```

### More API detail and example

See `/src` and `test/src`.
