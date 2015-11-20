import {
  ddescribe,
  describe,
  it,
  iit,
  xit,
  expect,
  beforeEach,
  afterEach
} from 'angular2/testing_internal';
import {
  DefaultIterableDiffer,
  DefaultIterableDifferFactory
} from 'angular2/src/core/change_detection/differs/default_iterable_differ';

import {NumberWrapper} from 'angular2/src/facade/lang';
import {ListWrapper, MapWrapper} from 'angular2/src/facade/collection';

import {TestIterable} from '../../../core/change_detection/iterable';
import {iterableChangesAsString} from '../../../core/change_detection/util';

// todo(vicb): UnmodifiableListView / frozen object when implemented
export function main() {
  describe('iterable differ', function() {
    describe('DefaultIterableDiffer', function() {
      var differ;

      beforeEach(() => { differ = new DefaultIterableDiffer(); });

      it('should support list and iterables', () => {
        var f = new DefaultIterableDifferFactory();
        expect(f.supports([])).toBeTruthy();
        expect(f.supports(new TestIterable())).toBeTruthy();
        expect(f.supports(new Map())).toBeFalsy();
        expect(f.supports(null)).toBeFalsy();
      });

      it('should support iterables', () => {
        let l = new TestIterable();

        differ.check(l);
        expect(differ.toString()).toEqual(iterableChangesAsString({collection: []}));

        l.list = [1];
        differ.check(l);
        expect(differ.toString())
            .toEqual(
                iterableChangesAsString({collection: ['1[null->0]'], additions: ['1[null->0]']}));

        l.list = [2, 1];
        differ.check(l);
        expect(differ.toString())
            .toEqual(iterableChangesAsString({
              collection: ['2[null->0]', '1[0->1]'],
              previous: ['1[0->1]'],
              additions: ['2[null->0]'],
              moves: ['1[0->1]']
            }));
      });

      it('should detect additions', () => {
        let l = [];
        differ.check(l);
        expect(differ.toString()).toEqual(iterableChangesAsString({collection: []}));

        l.push('a');
        differ.check(l);
        expect(differ.toString())
            .toEqual(
                iterableChangesAsString({collection: ['a[null->0]'], additions: ['a[null->0]']}));

        l.push('b');
        differ.check(l);
        expect(differ.toString())
            .toEqual(iterableChangesAsString(
                {collection: ['a', 'b[null->1]'], previous: ['a'], additions: ['b[null->1]']}));
      });

      it('should support changing the reference', () => {
        let l = [0];
        differ.check(l);

        l = [1, 0];
        differ.check(l);
        expect(differ.toString())
            .toEqual(iterableChangesAsString({
              collection: ['1[null->0]', '0[0->1]'],
              previous: ['0[0->1]'],
              additions: ['1[null->0]'],
              moves: ['0[0->1]']
            }));

        l = [2, 1, 0];
        differ.check(l);
        expect(differ.toString())
            .toEqual(iterableChangesAsString({
              collection: ['2[null->0]', '1[0->1]', '0[1->2]'],
              previous: ['1[0->1]', '0[1->2]'],
              additions: ['2[null->0]'],
              moves: ['1[0->1]', '0[1->2]']
            }));
      });

      it('should handle swapping element', () => {
        let l = [1, 2];
        differ.check(l);

        ListWrapper.clear(l);
        l.push(2);
        l.push(1);
        differ.check(l);
        expect(differ.toString())
            .toEqual(iterableChangesAsString({
              collection: ['2[1->0]', '1[0->1]'],
              previous: ['1[0->1]', '2[1->0]'],
              moves: ['2[1->0]', '1[0->1]']
            }));
      });

      it('should handle swapping element', () => {
        let l = ['a', 'b', 'c'];
        differ.check(l);

        ListWrapper.removeAt(l, 1);
        ListWrapper.insert(l, 0, 'b');
        differ.check(l);
        expect(differ.toString())
            .toEqual(iterableChangesAsString({
              collection: ['b[1->0]', 'a[0->1]', 'c'],
              previous: ['a[0->1]', 'b[1->0]', 'c'],
              moves: ['b[1->0]', 'a[0->1]']
            }));

        ListWrapper.removeAt(l, 1);
        l.push('a');
        differ.check(l);
        expect(differ.toString())
            .toEqual(iterableChangesAsString({
              collection: ['b', 'c[2->1]', 'a[1->2]'],
              previous: ['b', 'a[1->2]', 'c[2->1]'],
              moves: ['c[2->1]', 'a[1->2]']
            }));
      });

      it('should detect changes in list', () => {
        let l = [];
        differ.check(l);

        l.push('a');
        differ.check(l);
        expect(differ.toString())
            .toEqual(
                iterableChangesAsString({collection: ['a[null->0]'], additions: ['a[null->0]']}));

        l.push('b');
        differ.check(l);
        expect(differ.toString())
            .toEqual(iterableChangesAsString(
                {collection: ['a', 'b[null->1]'], previous: ['a'], additions: ['b[null->1]']}));

        l.push('c');
        l.push('d');
        differ.check(l);
        expect(differ.toString())
            .toEqual(iterableChangesAsString({
              collection: ['a', 'b', 'c[null->2]', 'd[null->3]'],
              previous: ['a', 'b'],
              additions: ['c[null->2]', 'd[null->3]']
            }));

        ListWrapper.removeAt(l, 2);
        differ.check(l);
        expect(differ.toString())
            .toEqual(iterableChangesAsString({
              collection: ['a', 'b', 'd[3->2]'],
              previous: ['a', 'b', 'c[2->null]', 'd[3->2]'],
              moves: ['d[3->2]'],
              removals: ['c[2->null]']
            }));

        ListWrapper.clear(l);
        l.push('d');
        l.push('c');
        l.push('b');
        l.push('a');
        differ.check(l);
        expect(differ.toString())
            .toEqual(iterableChangesAsString({
              collection: ['d[2->0]', 'c[null->1]', 'b[1->2]', 'a[0->3]'],
              previous: ['a[0->3]', 'b[1->2]', 'd[2->0]'],
              additions: ['c[null->1]'],
              moves: ['d[2->0]', 'b[1->2]', 'a[0->3]']
            }));
      });

      it('should test string by value rather than by reference (Dart)', () => {
        let l = ['a', 'boo'];
        differ.check(l);

        var b = 'b';
        var oo = 'oo';
        l[1] = b + oo;
        differ.check(l);
        expect(differ.toString())
            .toEqual(iterableChangesAsString({collection: ['a', 'boo'], previous: ['a', 'boo']}));
      });

      it('should ignore [NaN] != [NaN] (JS)', () => {
        let l = [NumberWrapper.NaN];
        differ.check(l);
        differ.check(l);
        expect(differ.toString())
            .toEqual(iterableChangesAsString(
                {collection: [NumberWrapper.NaN], previous: [NumberWrapper.NaN]}));
      });

      it('should detect [NaN] moves', () => {
        let l = [NumberWrapper.NaN, NumberWrapper.NaN];
        differ.check(l);

        ListWrapper.insert<any>(l, 0, 'foo');
        differ.check(l);
        expect(differ.toString())
            .toEqual(iterableChangesAsString({
              collection: ['foo[null->0]', 'NaN[0->1]', 'NaN[1->2]'],
              previous: ['NaN[0->1]', 'NaN[1->2]'],
              additions: ['foo[null->0]'],
              moves: ['NaN[0->1]', 'NaN[1->2]']
            }));
      });

      it('should remove and add same item', () => {
        let l = ['a', 'b', 'c'];
        differ.check(l);

        ListWrapper.removeAt(l, 1);
        differ.check(l);
        expect(differ.toString())
            .toEqual(iterableChangesAsString({
              collection: ['a', 'c[2->1]'],
              previous: ['a', 'b[1->null]', 'c[2->1]'],
              moves: ['c[2->1]'],
              removals: ['b[1->null]']
            }));

        ListWrapper.insert(l, 1, 'b');
        differ.check(l);
        expect(differ.toString())
            .toEqual(iterableChangesAsString({
              collection: ['a', 'b[null->1]', 'c[1->2]'],
              previous: ['a', 'c[1->2]'],
              additions: ['b[null->1]'],
              moves: ['c[1->2]']
            }));
      });

      it('should support duplicates', () => {
        let l = ['a', 'a', 'a', 'b', 'b'];
        differ.check(l);

        ListWrapper.removeAt(l, 0);
        differ.check(l);
        expect(differ.toString())
            .toEqual(iterableChangesAsString({
              collection: ['a', 'a', 'b[3->2]', 'b[4->3]'],
              previous: ['a', 'a', 'a[2->null]', 'b[3->2]', 'b[4->3]'],
              moves: ['b[3->2]', 'b[4->3]'],
              removals: ['a[2->null]']
            }));
      });

      it('should support insertions/moves', () => {
        let l = ['a', 'a', 'b', 'b'];
        differ.check(l);

        ListWrapper.insert(l, 0, 'b');
        differ.check(l);
        expect(differ.toString())
            .toEqual(iterableChangesAsString({
              collection: ['b[2->0]', 'a[0->1]', 'a[1->2]', 'b', 'b[null->4]'],
              previous: ['a[0->1]', 'a[1->2]', 'b[2->0]', 'b'],
              additions: ['b[null->4]'],
              moves: ['b[2->0]', 'a[0->1]', 'a[1->2]']
            }));
      });

      it('should not report unnecessary moves', () => {
        let l = ['a', 'b', 'c'];
        differ.check(l);

        ListWrapper.clear(l);
        l.push('b');
        l.push('a');
        l.push('c');
        differ.check(l);
        expect(differ.toString())
            .toEqual(iterableChangesAsString({
              collection: ['b[1->0]', 'a[0->1]', 'c'],
              previous: ['a[0->1]', 'b[1->0]', 'c'],
              moves: ['b[1->0]', 'a[0->1]']
            }));
      });

      describe('diff', () => {
        it('should return self when there is a change',
           () => { expect(differ.diff(['a', 'b'])).toBe(differ); });

        it('should return null when there is no change', () => {
          differ.diff(['a', 'b']);
          expect(differ.diff(['a', 'b'])).toEqual(null);
        });

        it('should treat null as an empty list', () => {
          differ.diff(['a', 'b']);
          expect(differ.diff(null).toString())
              .toEqual(iterableChangesAsString({
                previous: ['a[0->null]', 'b[1->null]'],
                removals: ['a[0->null]', 'b[1->null]']
              }));
        });

        it('should throw when given an invalid collection', () => {
          expect(() => differ.diff("invalid")).toThrowErrorWith("Error trying to diff 'invalid'");
        });
      });
    });
  });
}
