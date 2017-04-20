[WIP]

# IdxdDB

IndexdDB Wrapper

## Install

```
npm i idxddb
```

https://www.npmjs.com/package/idxddb

## How to Use

### Createing Store and open Database

```js
import IdxdDB from 'idxddb';

const schema = [
    {
        name: 'books',
        keyPath: 'id',
        autoIncrement: true;
        indexes: [
            { keyPath: 'info.title', as 'title' }
        ]
    }
]

const db = new IdxdDB('DataBaseName')
    .version(1, schema)
    .open()
```

### CRUD operation example

```js
// set record
db.set('books', { id: 1, info: { title: 'bookName' } })

// get record
db.get('books', 1)

// find record by key range and index
db.getBy('books', 'title', range => range.only('bookName'))
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
            { keyPath: 'info.title', as 'title' }
        ]
    }
]
```

### CRUD API

```js
/**
 * Create transaction and execute it.
 * transaction() can rollback when write error occured or you call request.abort().
 * Available request api list is see RequestClass in transaction.ts.
 * request api need 'yield' keyword.
 *
 * @returns {Promise<any>}
 * @example
 * db.tranaction(['store'], 'rw', function*(req) {
 *   const record1 = yield req.set('store', { id: 1 })
 *   return record1;
 * })
 */
transaction<K extends keyof T>(scope: K | K[], mode: 'r' | 'rw', executor: trx.Executor<T>): Promise<any>;

/**
 * Get record by primary key
 *
 * @returns {(Promise<T[K] | undefined>)}
 * @example
 * db.get('store', 1)
 */
get<K extends keyof T>(store: K, key: any): Promise<T[K] | undefined>;

/**
 * Get records by key range or index and key range.
 *
 * @returns {Promise<T[K][]>}
 * @example
 * db.getBy('store', 'index', range => range.bound(1, 5))
 */
getBy<K extends keyof T>(store: K, range: Request.RangeFunction): Promise<T[K][]>;
getBy<K extends keyof T>(store: K, index: keyof T[K] | string, range: Request.RangeFunction): Promise<T[K][]>;

/**
 * Get all record.
 *
 * @returns {Promise<T[K][]>}
 * @example
 * db.getAll('store')
 */
getAll<K extends keyof T>(store: K): Promise<T[K][]>;

/**
 * Set record.
 *
 * @returns {Promise<T[K]>}
 * @example
 * db.set('store', { id: 1 })
 */
set<K extends keyof T>(store: K, record: T[K], key?: any): Promise<T[K]>;

/**
 * Set multi records.
 *
 * @returns {Promise<T[K][]>}
 * @example
 * db.bulkSet('store', [{ id: 1 }, { id: 2 }])
 */
bulkSet<K extends keyof T>(store: K, records: T[K][]): Promise<T[K][]>;

/**
 * Delete record by primary key.
 *
 * @returns {(Promise<T[K] | undefined>)}
 * @example
 * db.delete('store', 1)
 */
delete<K extends keyof T>(store: K, key: any): Promise<T[K] | undefined>;

/**
 * Delete records by key range or index and key range
 *
 * @returns {Promise<T[K][]>}
 * @example
 * db.deleteBy('store', 'index', range => range.bound(1, 100))
 */
deleteBy<K extends keyof T>(store: K, range: Request.RangeFunction): Promise<T[K][]>;
deleteBy<K extends keyof T>(store: K, index: keyof T[K] | string, range: Request.RangeFunction): Promise<T[K][]>;

/**
 * Delete mutli records by primary keys.
 *
 * @returns {Promise<T[K][]>}
 * @example
 * db.bulkDelete('store', [1, 2, 3])
 */
bulkDelete<K extends keyof T>(store: K, keys: any[]): Promise<T[K][]>;

/**
 * Delete All record.
 *
 * @returns {Promise<T[K][]>}
 * @example
 * db.clear('store')
 */
clear<K extends keyof T>(store: K): Promise<T[K][]>;
```

### Getter API

```js
readonly isOpen: boolean;
readonly backendDB: IDBDatabase;
readonly currentVersion: number;
readonly KeyRange: typeof IDBKeyRange;
readonly storeNames: string[];
```


## Advanced

### Working on Node.js for testing

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
