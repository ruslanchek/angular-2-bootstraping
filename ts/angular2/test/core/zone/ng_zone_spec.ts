import {
  AsyncTestCompleter,
  beforeEach,
  ddescribe,
  describe,
  expect,
  iit,
  inject,
  it,
  xdescribe,
  xit,
  Log,
  isInInnerZone,
  browserDetection
} from 'angular2/testing_internal';

import {
  PromiseCompleter,
  PromiseWrapper,
  TimerWrapper,
  ObservableWrapper,
  EventEmitter
} from 'angular2/src/facade/async';
import {BaseException} from 'angular2/src/facade/exceptions';

import {NgZone, NgZoneError} from 'angular2/src/core/zone/ng_zone';

var needsLongerTimers = browserDetection.isSlow || browserDetection.isEdge;
var resultTimer = 1000;
var testTimeout = browserDetection.isEdge ? 1200 : 100;
// Schedules a macrotask (using a timer)
function macroTask(fn: (...args: any[]) => void, timer = 1): void {
  // adds longer timers for passing tests in IE and Edge
  _zone.runOutsideAngular(() => TimerWrapper.setTimeout(fn, needsLongerTimers ? timer : 1));
}

// Schedules a microtasks (using a resolved promise .then())
function microTask(fn: Function): void {
  PromiseWrapper.resolve(null).then((_) => { fn(); });
}

var _log;
var _errors: any[];
var _traces: any[];
var _zone;

function logOnError() {
  ObservableWrapper.subscribe(_zone.onError, (ngErr: NgZoneError) => {
    _errors.push(ngErr.error);
    _traces.push(ngErr.stackTrace);
  });
}

function logOnTurnStart() {
  ObservableWrapper.subscribe(_zone.onTurnStart, _log.fn('onTurnStart'));
}

function logOnTurnDone() {
  ObservableWrapper.subscribe(_zone.onTurnDone, _log.fn('onTurnDone'));
}

function logOnEventDone() {
  ObservableWrapper.subscribe(_zone.onEventDone, _log.fn('onEventDone'));
}

export function main() {
  describe("NgZone", () => {

    function createZone(enableLongStackTrace) {
      return new NgZone({enableLongStackTrace: enableLongStackTrace});
    }

    beforeEach(() => {
      _log = new Log();
      _errors = [];
      _traces = [];
    });

    describe('long stack trace', () => {
      beforeEach(() => { _zone = createZone(true); });

      commonTests();

      it('should produce long stack traces', inject([AsyncTestCompleter], (async) => {
           macroTask(() => {
             logOnError();
             var c: PromiseCompleter<any> = PromiseWrapper.completer();

             _zone.run(() => {
               TimerWrapper.setTimeout(() => {
                 TimerWrapper.setTimeout(() => {
                   c.resolve(null);
                   throw new BaseException('ccc');
                 }, 0);
               }, 0);
             });

             c.promise.then((_) => {
               expect(_traces.length).toBe(1);
               expect(_traces[0].length).toBeGreaterThan(1);
               async.done();
             });
           });
         }), testTimeout);

      it('should produce long stack traces (when using microtasks)',
         inject([AsyncTestCompleter], (async) => {
           macroTask(() => {
             logOnError();
             var c: PromiseCompleter<any> = PromiseWrapper.completer();

             _zone.run(() => {
               microTask(() => {
                 microTask(() => {
                   c.resolve(null);
                   throw new BaseException("ddd");
                 });
               });
             });

             c.promise.then((_) => {
               expect(_traces.length).toBe(1);
               expect(_traces[0].length).toBeGreaterThan(1);
               async.done();
             });
           });
         }), testTimeout);
    });

    describe('short stack trace', () => {
      beforeEach(() => { _zone = createZone(false); });

      commonTests();

      it('should disable long stack traces', inject([AsyncTestCompleter], (async) => {
           macroTask(() => {
             logOnError();
             var c: PromiseCompleter<any> = PromiseWrapper.completer();

             _zone.run(() => {
               TimerWrapper.setTimeout(() => {
                 TimerWrapper.setTimeout(() => {
                   c.resolve(null);
                   throw new BaseException('ccc');
                 }, 0);
               }, 0);
             });

             c.promise.then((_) => {
               expect(_traces.length).toBe(1);
               expect(_traces[0].length).toEqual(1);
               async.done();
             });
           });
         }), testTimeout);
    });
  });
}

function commonTests() {
  describe('hasPendingMicrotasks', () => {
    it('should be false', () => { expect(_zone.hasPendingMicrotasks).toBe(false); });

    it('should be true', () => {
      _zone.run(() => { microTask(() => {}); });
      expect(_zone.hasPendingMicrotasks).toBe(true);
    });
  });

  describe('hasPendingTimers', () => {
    it('should be false', () => { expect(_zone.hasPendingTimers).toBe(false); });

    it('should be true', () => {
      _zone.run(() => { TimerWrapper.setTimeout(() => {}, 0); });
      expect(_zone.hasPendingTimers).toBe(true);
    });
  });

  describe('hasPendingAsyncTasks', () => {
    it('should be false', () => { expect(_zone.hasPendingAsyncTasks).toBe(false); });

    it('should be true when microtask is scheduled', () => {
      _zone.run(() => { microTask(() => {}); });
      expect(_zone.hasPendingAsyncTasks).toBe(true);
    });

    it('should be true when timer is scheduled', () => {
      _zone.run(() => { TimerWrapper.setTimeout(() => {}, 0); });
      expect(_zone.hasPendingAsyncTasks).toBe(true);
    });
  });

  describe('isInInnerZone', () => {
    it('should return whether the code executes in the inner zone', () => {
      expect(isInInnerZone()).toEqual(false);
      _zone.run(() => { expect(isInInnerZone()).toEqual(true); });
    }, testTimeout);
  });

  describe('run', () => {
    it('should return the body return value from run', inject([AsyncTestCompleter], (async) => {
         macroTask(() => { expect(_zone.run(() => { return 6; })).toEqual(6); });

         macroTask(() => { async.done(); });
       }), testTimeout);

    it('should call onTurnStart and onTurnDone', inject([AsyncTestCompleter], (async) => {
         logOnTurnStart();
         logOnTurnDone();
         macroTask(() => { _zone.run(_log.fn('run')); });

         macroTask(() => {
           expect(_log.result()).toEqual('onTurnStart; run; onTurnDone');
           async.done();
         });
       }), testTimeout);

    it('should call onEventDone once at the end of event', inject([AsyncTestCompleter], (async) => {
         // The test is set up in a way that causes the zone loop to run onTurnDone twice
         // then verified that onEventDone is only called once at the end
         logOnEventDone();

         var times = 0;
         ObservableWrapper.subscribe(_zone.onTurnDone, (_) => {
           times++;
           _log.add(`onTurnDone ${times}`);
           if (times < 2) {
             // Scheduling a microtask causes a second digest
             _zone.run(() => { microTask(() => {}); });
           }
         });

         macroTask(() => { _zone.run(_log.fn('run')); });

         macroTask(() => {
           expect(_log.result()).toEqual('run; onTurnDone 1; onTurnDone 2; onEventDone');
           async.done();
         }, resultTimer);
       }), testTimeout);

    it('should call standalone onEventDone', inject([AsyncTestCompleter], (async) => {
         logOnEventDone();

         macroTask(() => { _zone.run(_log.fn('run')); });

         macroTask(() => {
           expect(_log.result()).toEqual('run; onEventDone');
           async.done();
         }, resultTimer);
       }), testTimeout);

    it('should run subscriber listeners in the subscription zone (outside)',
       inject([AsyncTestCompleter], (async) => {
         // Each subscriber fires a microtask outside the Angular zone. The test
         // then verifies that those microtasks do not cause additional digests.

         var turnStart = false;
         ObservableWrapper.subscribe(_zone.onTurnStart, (_) => {
           if (turnStart) throw 'Should not call this more than once';
           _log.add('onTurnStart');
           microTask(() => {});
           turnStart = true;
         });

         var turnDone = false;
         ObservableWrapper.subscribe(_zone.onTurnDone, (_) => {
           if (turnDone) throw 'Should not call this more than once';
           _log.add('onTurnDone');
           microTask(() => {});
           turnDone = true;
         });

         var eventDone = false;
         ObservableWrapper.subscribe(_zone.onEventDone, (_) => {
           if (eventDone) throw 'Should not call this more than once';
           _log.add('onEventDone');
           microTask(() => {});
           eventDone = true;
         });

         macroTask(() => { _zone.run(_log.fn('run')); });

         macroTask(() => {
           expect(_log.result()).toEqual('onTurnStart; run; onTurnDone; onEventDone');
           async.done();
         }, resultTimer);
       }), testTimeout);

    it('should run subscriber listeners in the subscription zone (inside)',
       inject([AsyncTestCompleter], (async) => {
         // the only practical use-case to run a callback inside the zone is
         // change detection after "onTurnDone". That's the only case tested.
         var turnDone = false;
         ObservableWrapper.subscribe(_zone.onTurnDone, (_) => {
           _log.add('onTurnDone');
           if (turnDone) return;
           _zone.run(() => { microTask(() => {}); });
           turnDone = true;
         });

         macroTask(() => { _zone.run(_log.fn('run')); });

         macroTask(() => {
           expect(_log.result()).toEqual('run; onTurnDone; onTurnDone');
           async.done();
         }, resultTimer);
       }), testTimeout);

    it('should run async tasks scheduled inside onEventDone outside Angular zone',
       inject([AsyncTestCompleter], (async) => {
         ObservableWrapper.subscribe(_zone.onEventDone, (_) => {
           _log.add('onEventDone');
           // If not implemented correctly, this time will cause another digest,
           // which is not what we want.
           TimerWrapper.setTimeout(() => { _log.add('asyncTask'); }, 5);
         });

         logOnTurnDone();

         macroTask(() => { _zone.run(_log.fn('run')); });

         macroTask(() => {
           TimerWrapper.setTimeout(() => {
             expect(_log.result()).toEqual('run; onTurnDone; onEventDone; asyncTask');
             async.done();
           }, 50);
         });
       }), testTimeout);

    it('should call onTurnStart once before a turn and onTurnDone once after the turn',
       inject([AsyncTestCompleter], (async) => {
         logOnTurnStart();
         logOnTurnDone();

         macroTask(() => {
           _zone.run(() => {
             _log.add('run start');
             microTask(_log.fn('async'));
             _log.add('run end');
           });
         });

         macroTask(() => {
           // The microtask (async) is executed after the macrotask (run)
           expect(_log.result()).toEqual('onTurnStart; run start; run end; async; onTurnDone');
           async.done();
         }, resultTimer);
       }), testTimeout);

    it('should not run onTurnStart and onTurnDone for nested Zone.run',
       inject([AsyncTestCompleter], (async) => {
         logOnTurnStart();
         logOnTurnDone();
         macroTask(() => {
           _zone.run(() => {
             _log.add('start run');
             _zone.run(() => {
               _log.add('nested run');
               microTask(_log.fn('nested run microtask'));
             });
             _log.add('end run');
           });
         });

         macroTask(() => {
           expect(_log.result())
               .toEqual(
                   'onTurnStart; start run; nested run; end run; nested run microtask; onTurnDone');
           async.done();
         }, resultTimer);
       }), testTimeout);

    it('should not run onTurnStart and onTurnDone for nested Zone.run invoked from onTurnDone',
       inject([AsyncTestCompleter], (async) => {
         ObservableWrapper.subscribe(_zone.onTurnDone, (_) => {
           _log.add('onTurnDone:started');
           _zone.run(() => _log.add('nested run'));
           _log.add('onTurnDone:finished');
         });

         macroTask(() => { _zone.run(() => { _log.add('start run'); }); });

         macroTask(() => {
           expect(_log.result())
               .toEqual('start run; onTurnDone:started; nested run; onTurnDone:finished');
           async.done();
         }, resultTimer);
       }), testTimeout);

    it('should call onTurnStart and onTurnDone before and after each top-level run',
       inject([AsyncTestCompleter], (async) => {
         logOnTurnStart();
         logOnTurnDone();

         macroTask(() => { _zone.run(_log.fn('run1')); });

         macroTask(() => { _zone.run(_log.fn('run2')); });

         macroTask(() => {
           expect(_log.result())
               .toEqual('onTurnStart; run1; onTurnDone; onTurnStart; run2; onTurnDone');
           async.done();
         }, resultTimer);
       }), testTimeout);

    it('should call onTurnStart and onTurnDone before and after each turn',
       inject([AsyncTestCompleter], (async) => {
         logOnTurnStart();
         logOnTurnDone();

         var a: PromiseCompleter<string>;
         var b: PromiseCompleter<string>;

         macroTask(() => {
           _zone.run(() => {
             a = PromiseWrapper.completer();
             b = PromiseWrapper.completer();

             _log.add('run start');
             a.promise.then(_log.fn('a then'));
             b.promise.then(_log.fn('b then'));
           });
         });

         macroTask(() => {
           _zone.run(() => {
             a.resolve('a');
             b.resolve('b');
           });
         });

         macroTask(() => {
           expect(_log.result())
               .toEqual(
                   'onTurnStart; run start; onTurnDone; onTurnStart; a then; b then; onTurnDone');
           async.done();
         }, resultTimer);
       }), testTimeout);

    it('should run a function outside of the angular zone',
       inject([AsyncTestCompleter], (async) => {
         logOnTurnStart();
         logOnTurnDone();

         macroTask(() => { _zone.runOutsideAngular(_log.fn('run')); });

         macroTask(() => {
           expect(_log.result()).toEqual('run');
           async.done()
         });
       }), testTimeout);

    it('should call onTurnStart and onTurnDone when an inner microtask is scheduled from outside angular',
       inject([AsyncTestCompleter], (async) => {
         logOnTurnStart();
         logOnTurnDone();

         var completer: PromiseCompleter<any>;

         macroTask(
             () => { _zone.runOutsideAngular(() => { completer = PromiseWrapper.completer(); }); });

         macroTask(
             () => { _zone.run(() => { completer.promise.then(_log.fn('executedMicrotask')); }); });

         macroTask(() => {
           _zone.runOutsideAngular(() => {
             _log.add('scheduling a microtask');
             completer.resolve(null);
           });
         });

         macroTask(() => {
           expect(_log.result())
               .toEqual(
                   // First VM turn => setup Promise then
                   'onTurnStart; onTurnDone; ' +
                   // Second VM turn (outside of anguler)
                   'scheduling a microtask; ' +
                   // Third VM Turn => execute the microtask (inside angular)
                   'onTurnStart; executedMicrotask; onTurnDone');
           async.done();
         }, resultTimer);
       }), testTimeout);

    it('should call onTurnStart before executing a microtask scheduled in onTurnDone as well as ' +
           'onTurnDone after executing the task',
       inject([AsyncTestCompleter], (async) => {
         var ran = false;
         logOnTurnStart();

         ObservableWrapper.subscribe(_zone.onTurnDone, (_) => {
           _log.add('onTurnDone(begin)');

           if (!ran) {
             _zone.run(() => {
               microTask(() => {
                 ran = true;
                 _log.add('executedMicrotask');
               });
             });
           }

           _log.add('onTurnDone(end)');
         });

         macroTask(() => { _zone.run(_log.fn('run')); });

         macroTask(() => {
           expect(_log.result())
               .toEqual(
                   // First VM turn => 'run' macrotask
                   'onTurnStart; run; onTurnDone(begin); onTurnDone(end); ' +
                   // Second VM Turn => microtask enqueued from onTurnDone
                   'onTurnStart; executedMicrotask; onTurnDone(begin); onTurnDone(end)');
           async.done();
         }, resultTimer);
       }), testTimeout);

    it('should call onTurnStart and onTurnDone for a scheduleMicrotask in onTurnDone triggered by ' +
           'a scheduleMicrotask in run',
       inject([AsyncTestCompleter], (async) => {
         var ran = false;
         logOnTurnStart();

         ObservableWrapper.subscribe(_zone.onTurnDone, (_) => {
           _log.add('onTurnDone(begin)');
           if (!ran) {
             _log.add('onTurnDone(scheduleMicrotask)');
             _zone.run(() => {
               microTask(() => {
                 ran = true;
                 _log.add('onTurnDone(executeMicrotask)');
               });
             });
           }
           _log.add('onTurnDone(end)');
         });

         macroTask(() => {
           _zone.run(() => {
             _log.add('scheduleMicrotask');
             microTask(_log.fn('run(executeMicrotask)'));
           });
         });

         macroTask(() => {
           expect(_log.result())
               .toEqual(
                   // First VM Turn => a macrotask + the microtask it enqueues
                   'onTurnStart; scheduleMicrotask; run(executeMicrotask); onTurnDone(begin); onTurnDone(scheduleMicrotask); onTurnDone(end); ' +
                   // Second VM Turn => the microtask enqueued from onTurnDone
                   'onTurnStart; onTurnDone(executeMicrotask); onTurnDone(begin); onTurnDone(end)');
           async.done();
         }, resultTimer);
       }), testTimeout);

    it('should execute promises scheduled in onTurnStart before promises scheduled in run',
       inject([AsyncTestCompleter], (async) => {
         var donePromiseRan = false;
         var startPromiseRan = false;

         ObservableWrapper.subscribe(_zone.onTurnStart, (_) => {
           _log.add('onTurnStart(begin)');
           if (!startPromiseRan) {
             _log.add('onTurnStart(schedulePromise)');
             _zone.run(() => { microTask(_log.fn('onTurnStart(executePromise)')); });
             startPromiseRan = true;
           }
           _log.add('onTurnStart(end)');
         });

         ObservableWrapper.subscribe(_zone.onTurnDone, (_) => {
           _log.add('onTurnDone(begin)');
           if (!donePromiseRan) {
             _log.add('onTurnDone(schedulePromise)');
             _zone.run(() => { microTask(_log.fn('onTurnDone(executePromise)')); });
             donePromiseRan = true;
           }
           _log.add('onTurnDone(end)');
         });

         macroTask(() => {
           _zone.run(() => {
             _log.add('run start');
             PromiseWrapper.resolve(null)
                 .then((_) => {
                   _log.add('promise then');
                   PromiseWrapper.resolve(null).then(_log.fn('promise foo'));
                   return PromiseWrapper.resolve(null);
                 })
                 .then(_log.fn('promise bar'));
             _log.add('run end');
           });
         });

         macroTask(() => {
           expect(_log.result())
               .toEqual(
                   // First VM turn: enqueue a microtask in onTurnStart
                   'onTurnStart(begin); onTurnStart(schedulePromise); onTurnStart(end); ' +
                   // First VM turn: execute the macrotask which enqueues microtasks
                   'run start; run end; ' +
                   // First VM turn: execute enqueued microtasks
                   'onTurnStart(executePromise); promise then; promise foo; promise bar; ' +
                   // First VM turn: onTurnEnd, enqueue a microtask
                   'onTurnDone(begin); onTurnDone(schedulePromise); onTurnDone(end); ' +
                   // Second VM turn: execute the microtask from onTurnEnd
                   'onTurnStart(begin); onTurnStart(end); onTurnDone(executePromise); onTurnDone(begin); onTurnDone(end)');
           async.done();
         }, resultTimer);
       }), testTimeout);

    it('should call onTurnStart and onTurnDone before and after each turn, respectively',
       inject([AsyncTestCompleter], (async) => {
         var completerA: PromiseCompleter<any>;
         var completerB: PromiseCompleter<any>;

         logOnTurnStart();
         logOnTurnDone();

         macroTask(() => {
           _zone.run(() => {
             completerA = PromiseWrapper.completer();
             completerB = PromiseWrapper.completer();
             completerA.promise.then(_log.fn('a then'));
             completerB.promise.then(_log.fn('b then'));
             _log.add('run start');
           });
         });

         macroTask(() => { _zone.run(() => { completerA.resolve(null); }); }, 20);

         macroTask(() => { _zone.run(() => { completerB.resolve(null); }); }, 500);

         macroTask(() => {
           expect(_log.result())
               .toEqual(
                   // First VM turn
                   'onTurnStart; run start; onTurnDone; ' +
                   // Second VM turn
                   'onTurnStart; a then; onTurnDone; ' +
                   // Third VM turn
                   'onTurnStart; b then; onTurnDone');
           async.done();
         }, resultTimer);
       }), testTimeout);

    it('should call onTurnStart and onTurnDone before and after (respectively) all turns in a chain',
       inject([AsyncTestCompleter], (async) => {
         logOnTurnStart();
         logOnTurnDone();

         macroTask(() => {
           _zone.run(() => {
             _log.add('run start');
             microTask(() => {
               _log.add('async1');
               microTask(_log.fn('async2'));
             });
             _log.add('run end');
           });
         });

         macroTask(() => {
           expect(_log.result())
               .toEqual('onTurnStart; run start; run end; async1; async2; onTurnDone');
           async.done();
         }, resultTimer);
       }), testTimeout);

    it('should call onTurnStart and onTurnDone for promises created outside of run body',
       inject([AsyncTestCompleter], (async) => {
         logOnTurnStart();
         logOnTurnDone();

         var promise;

         macroTask(() => {
           _zone.runOutsideAngular(() => {
             promise = PromiseWrapper.resolve(4).then((x) => PromiseWrapper.resolve(x));
           });

           _zone.run(() => {
             promise.then(_log.fn('promise then'));
             _log.add('zone run');
           });
         });

         macroTask(() => {
           expect(_log.result())
               .toEqual('onTurnStart; zone run; onTurnDone; onTurnStart; promise then; onTurnDone');
           async.done();
         }, resultTimer);
       }), testTimeout);
  });

  describe('exceptions', () => {
    it('should call the on error callback when it is defined',
       inject([AsyncTestCompleter], (async) => {
         macroTask(() => {
           logOnError();

           var exception = new BaseException('sync');

           _zone.run(() => { throw exception; });

           expect(_errors.length).toBe(1);
           expect(_errors[0]).toBe(exception);
           async.done();
         });
       }), testTimeout);

    it('should call onError for errors from microtasks', inject([AsyncTestCompleter], (async) => {
         logOnError();

         var exception = new BaseException('async');

         macroTask(() => { _zone.run(() => { microTask(() => { throw exception; }); }); });

         macroTask(() => {
           expect(_errors.length).toBe(1);
           expect(_errors[0]).toEqual(exception);
           async.done();
         }, resultTimer);
       }), testTimeout);
  });
}
