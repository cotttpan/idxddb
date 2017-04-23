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

