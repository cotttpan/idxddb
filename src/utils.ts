export function has(target: object, key: string) {
    return target.hasOwnProperty(key);
}

export function last<T>(iterable: Iterable<T>) {
    const arr = Array.from(iterable);
    return arr[arr.length - 1];
}

export function includes<T>(iterable: Iterable<T>, target: any) {
    return [...iterable].indexOf(target) > -1;
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

export function bundle<A>(...fns: ((a: A) => any)[]): (a: A) => any;
export function bundle<A1, A2>(...fns: ((a1: A1, a2: A2) => any)[]): (a1: A1, a2: A2) => any;
export function bundle<A1, A2, A3>(...fns: ((a1: A1, a2: A2, a3: A3) => any)[]): (a1: A1, a2: A2, a3: A3) => any;
export function bundle(...fns: Function[]) {
    return bundled;
    function bundled() {
        fns.forEach(f => f.apply(null, arguments));
    }
}

export function identity<T>(value: T) {
    return value;
}

export function noop() {/* no operation */ }

export function difference<T>(a1: T[], a2: T[]) {
    return a1.filter(x => a2.indexOf(x) < 0);
}

export function intersection<T>(a1: T[], a2: T[]) {
    return [...new Set([...a1, ...a2])].filter(x => (a1.indexOf(x) > -1 && a2.indexOf(x) > -1));
}

export function groupBy<T, K extends keyof T>(arr: T[], key: K): { [k: string]: T } {
    return arr.reduce((acc, obj) => {
        const k = obj[key];
        acc[k] = obj;
        return acc;
    }, {} as any);
}

export function constant<T>(v: T) {
    return (..._x: any[]) => v;
}

export function onlyThatTime(n: number, callback: () => any): () => void;
export function onlyThatTime<A>(n: number, callback: (a: A) => any, init?: [A]): (a: A) => void;
export function onlyThatTime<A1, A2>(n: number, callback: (a1: A1, a2: A2) => any, init?: [A1, A2]): (a1: A1, a2: A2) => void;
export function onlyThatTime<A1, A2, A3>(n: number, callback: (a1: A1, a2: A2, a3: A3) => any, init?: [A1, A2, A3]): (a1: A1, a2: A2, a3: A3) => void;
export function onlyThatTime(n: number, callback: Function, init: any[] = []): Function {
    let called = false;
    let count = 0;
    return (n <= 0) ? constant(awaiter)(callback.apply(null, init)) : awaiter;

    function awaiter() {
        count = count + 1;
        if (called) return;
        if (n === count) {
            called = true;
            callback.apply(null, arguments);
        }
    }
}
