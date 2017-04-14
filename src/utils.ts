export function has(target: object, key: string) {
    return target.hasOwnProperty(key);
}

export function last<T>(iterable: Iterable<T>) {
    const arr = Array.from(iterable);
    return arr[arr.length - 1];
}

export function tap<T>(fn: (v: T) => any) {
    return (val: T) => {
        fn(val);
        return val;
    };
}

export function existy(v: any) {
    return !(v === null || v === undefined);
}
