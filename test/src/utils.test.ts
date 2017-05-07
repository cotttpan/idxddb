import * as assert from 'assert';
import * as Utils from './../../src/utils';
import * as sinon from 'sinon';

describe('has', () => {
    const target = { prop: 'prop' };
    it('validate that key is exist', () => {
        assert.equal(Utils.has(target, 'prop'), true);
        assert.equal(Utils.has(target, 'xxx'), false);
    });
});

describe('last', () => {
    const t1 = [1, 2, 3];
    const t2 = new Map([[1, '1'], [2, '2']]);
    it('return last element', () => {
        assert.equal(Utils.last(t1), 3);
        assert.deepEqual(Utils.last(t2), [2, '2']);
    });
});

describe('includes', () => {
    const arr = [1, 2, 3];
    it('return true if element include in arr', () => {
        assert(Utils.includes(arr, 1));
        assert(!Utils.includes(arr, 4));
    });
});

describe('tap', () => {
    it('implement function as side effect', () => {
        const f = sinon.spy();
        const r = Utils.tap(f)(1);
        assert.equal(r, 1);
        assert(f.calledWithExactly(1));
    });
});

describe('existy', () => {
    it('validate that value is not null or undefined', () => {
        assert.equal(Utils.existy(1), true);
        assert.equal(Utils.existy(undefined), false);
        assert.equal(Utils.existy(null), false);
    });
});

describe('bundle', () => {
    it('bundle each function and call as side effect', () => {
        const f1 = sinon.spy();
        const f2 = sinon.spy();
        assert.equal(Utils.bundle(f1, f2)(1), undefined);
        assert(f1.calledWith(1));
        assert(f2.calledWith(1));
    });
});

describe('difference', () => {
    it('return difference set', () => {
        const r = Utils.difference([3, 1, 2], [1, 4]);
        assert.deepEqual(r, [3, 2]);
    });
});

describe('intersection?', () => {
    it('return intersection set', () => {
        const r = Utils.intersection([3, 1, 2, 5], [1, 4, 5]);
        assert.deepEqual(r, [1, 5]);
    });
});


describe('constant', () => {
    it('always return same value', () => {
        const f = Utils.constant(1);
        let i = 0;
        while (++i < 3) assert.equal(f(), 1);
    });
});

describe('onlyThatTime', () => {
    it('call callback just once when function is called n times and can pass params it', () => {
        const spy = sinon.spy();
        const f: any = Utils.onlyThatTime(3, spy);
        let i = 0;
        while (++i < 5) f(i);
        assert(spy.calledOnce);
        assert(spy.calledWith(3));
    });

    it('call callback when time is 0 and call initial params', () => {
        const spy = sinon.spy();
        const f = Utils.onlyThatTime(0, spy as any, [0]);
        let i = 0;
        while (++i < 5) f(i);
        assert(spy.calledOnce);
        assert(spy.calledWith(0));
    });
});
