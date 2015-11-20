import {
  AsyncTestCompleter,
  TestComponentBuilder,
  beforeEach,
  ddescribe,
  describe,
  expect,
  iit,
  inject,
  it,
  xit
} from 'angular2/testing_internal';
import {
  bind,
  provide,
  forwardRef,
  resolveForwardRef,
  Component,
  Directive,
  Inject,
  Query,
  QueryList,
  View
} from 'angular2/core';
import {NgFor} from 'angular2/common';
import {Type} from 'angular2/src/facade/lang';
import {asNativeElements} from 'angular2/core';

export function main() {
  describe("forwardRef integration", function() {
    it('should instantiate components which are declared using forwardRef',
       inject([TestComponentBuilder, AsyncTestCompleter], (tcb: TestComponentBuilder, async) => {
         tcb.createAsync(App).then((tc) => {
           tc.detectChanges();
           expect(asNativeElements(tc.debugElement.componentViewChildren))
               .toHaveText('frame(lock)');
           async.done();
         });
       }));
  });
}

@Component({selector: 'app', viewProviders: [forwardRef(() => Frame)]})
@View({
  template: `<door><lock></lock></door>`,
  directives: [forwardRef(() => Door), forwardRef(() => Lock)],
})
class App {
}

@Component({selector: 'Lock'})
@View({
  directives: [NgFor],
  template: `{{frame.name}}(<span *ng-for="var lock of locks">{{lock.name}}</span>)`,
})
class Door {
  locks: QueryList<Lock>;
  frame: Frame;

  constructor(@Query(forwardRef(() => Lock)) locks: QueryList<Lock>,
              @Inject(forwardRef(() => Frame)) frame: Frame) {
    this.frame = frame;
    this.locks = locks;
  }
}

class Frame {
  name: string;
  constructor() { this.name = 'frame'; }
}

@Directive({selector: 'lock'})
class Lock {
  name: string;
  constructor() { this.name = 'lock'; }
}
