export declare function has(target: object, key: string): boolean;
export declare function last<T>(iterable: Iterable<T>): T;
export declare function tap<T>(fn: (v: T) => any): (val: T) => T;
export declare function existy(v: any): boolean;
export declare function bundle<T>(...fns: ((val: T) => any)[]): (...v: T[]) => void;
export declare function identity<T>(value: T): T;
