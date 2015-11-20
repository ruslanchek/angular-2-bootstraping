import {
  AsyncTestCompleter,
  beforeEach,
  ddescribe,
  describe,
  expect,
  iit,
  inject,
  it,
  xit,
} from 'angular2/testing_internal';

import {bind, provide} from 'angular2/core';

export function main() {
  describe('provider', () => {

    describe('type errors', () => {

      it('should throw when trying to create a class provider and not passing a class', () => {
        expect(() => { bind('foo').toClass(<any>0); })
            .toThrowError('Trying to create a class provider but "0" is not a class!');
      });

      it('should throw when trying to create a factory provider and not passing a function', () => {
        expect(() => { bind('foo').toFactory(<any>0); })
            .toThrowError('Trying to create a factory provider but "0" is not a function!');
      });
    });
  });
}
