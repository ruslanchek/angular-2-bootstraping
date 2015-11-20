import {
  AsyncTestCompleter,
  afterEach,
  beforeEach,
  ddescribe,
  describe,
  expect,
  iit,
  inject,
  it,
  xit,
  SpyObject
} from 'angular2/testing_internal';
import {ObservableWrapper} from 'angular2/src/facade/async';
import {BrowserJsonp} from 'angular2/src/http/backends/browser_jsonp';
import {
  JSONPConnection,
  JSONPConnection_,
  JSONPBackend,
  JSONPBackend_
} from 'angular2/src/http/backends/jsonp_backend';
import {provide, Injector} from 'angular2/core';
import {isPresent, StringWrapper} from 'angular2/src/facade/lang';
import {TimerWrapper} from 'angular2/src/facade/async';
import {Request} from 'angular2/src/http/static_request';
import {Response} from 'angular2/src/http/static_response';
import {Map} from 'angular2/src/facade/collection';
import {RequestOptions, BaseRequestOptions} from 'angular2/src/http/base_request_options';
import {BaseResponseOptions, ResponseOptions} from 'angular2/src/http/base_response_options';
import {ResponseTypes, ReadyStates, RequestMethods} from 'angular2/src/http/enums';

var addEventListenerSpy;
var existingScripts = [];
var unused: Response;

class MockBrowserJsonp extends BrowserJsonp {
  src: string;
  callbacks = new Map<string, (data: any) => any>();
  constructor() { super(); }

  addEventListener(type: string, cb: (data: any) => any) { this.callbacks.set(type, cb); }

  removeEventListener(type: string, cb: Function) { this.callbacks.delete(type); }

  dispatchEvent(type: string, argument?: any) {
    if (!isPresent(argument)) {
      argument = {};
    }
    let cb = this.callbacks.get(type);
    if (isPresent(cb)) {
      cb(argument);
    }
  }

  build(url: string) {
    var script = new MockBrowserJsonp();
    script.src = url;
    existingScripts.push(script);
    return script;
  }

  send(node: any) { /* noop */
  }
  cleanup(node: any) { /* noop */
  }
}

export function main() {
  describe('JSONPBackend', () => {
    let backend;
    let sampleRequest;

    beforeEach(() => {
      let injector = Injector.resolveAndCreate([
        provide(ResponseOptions, {useClass: BaseResponseOptions}),
        provide(BrowserJsonp, {useClass: MockBrowserJsonp}),
        provide(JSONPBackend, {useClass: JSONPBackend_})
      ]);
      backend = injector.get(JSONPBackend);
      let base = new BaseRequestOptions();
      sampleRequest = new Request(base.merge(new RequestOptions({url: 'https://google.com'})));
    });

    afterEach(() => { existingScripts = []; });

    it('should create a connection', () => {
      var instance;
      expect(() => instance = backend.createConnection(sampleRequest)).not.toThrow();
      expect(instance).toBeAnInstanceOf(JSONPConnection);
    });


    describe('JSONPConnection', () => {
      it('should use the injected BaseResponseOptions to create the response',
         inject([AsyncTestCompleter], async => {
           let connection = new JSONPConnection_(sampleRequest, new MockBrowserJsonp(),
                                                 new ResponseOptions({type: ResponseTypes.Error}));
           connection.response.subscribe(res => {
             expect(res.type).toBe(ResponseTypes.Error);
             async.done();
           });
           connection.finished();
           existingScripts[0].dispatchEvent('load');
         }));

      it('should ignore load/callback when disposed', inject([AsyncTestCompleter], async => {
           var connection = new JSONPConnection_(sampleRequest, new MockBrowserJsonp());
           let spy = new SpyObject();
           let loadSpy = spy.spy('load');
           let errorSpy = spy.spy('error');
           let returnSpy = spy.spy('cancelled');

           let request = connection.response.subscribe(loadSpy, errorSpy, returnSpy);
           request.unsubscribe();

           connection.finished('Fake data');
           existingScripts[0].dispatchEvent('load');

           TimerWrapper.setTimeout(() => {
             expect(connection.readyState).toBe(ReadyStates.Cancelled);
             expect(loadSpy).not.toHaveBeenCalled();
             expect(errorSpy).not.toHaveBeenCalled();
             expect(returnSpy).not.toHaveBeenCalled();
             async.done();
           }, 10);
         }));

      it('should report error if loaded without invoking callback',
         inject([AsyncTestCompleter], async => {
           let connection = new JSONPConnection_(sampleRequest, new MockBrowserJsonp());
           connection.response.subscribe(
               res => {
                 expect("response listener called").toBe(false);
                 async.done();
               },
               err => {
                 expect(err.text()).toEqual('JSONP injected script did not invoke callback.');
                 async.done();
               });

           existingScripts[0].dispatchEvent('load');
         }));

      it('should report error if script contains error', inject([AsyncTestCompleter], async => {
           let connection = new JSONPConnection_(sampleRequest, new MockBrowserJsonp());

           connection.response.subscribe(
               res => {
                 expect("response listener called").toBe(false);
                 async.done();
               },
               err => {
                 expect(err.text()).toBe('Oops!');
                 async.done();
               });

           existingScripts[0].dispatchEvent('error', ({message: "Oops!"}));
         }));

      it('should throw if request method is not GET', () => {
        [RequestMethods.Post, RequestMethods.Put, RequestMethods.Delete, RequestMethods.Options,
         RequestMethods.Head, RequestMethods.Patch]
            .forEach(method => {
              let base = new BaseRequestOptions();
              let req = new Request(
                  base.merge(new RequestOptions({url: 'https://google.com', method: method})));
              expect(() => new JSONPConnection_(req, new MockBrowserJsonp()).response.subscribe())
                  .toThrowError();
            });
      });

      it('should respond with data passed to callback', inject([AsyncTestCompleter], async => {
           let connection = new JSONPConnection_(sampleRequest, new MockBrowserJsonp());

           connection.response.subscribe(res => {
             expect(res.json()).toEqual(({fake_payload: true, blob_id: 12345}));
             async.done();
           });

           connection.finished(({fake_payload: true, blob_id: 12345}));
           existingScripts[0].dispatchEvent('load');
         }));
    });
  });
}
