import {
  AsyncTestCompleter,
  inject,
  describe,
  it,
  expect,
  beforeEach,
  createTestInjector,
  beforeEachBindings
} from 'angular2/testing_internal';
import {SpyMessageBroker} from './spies';
import {Type} from 'angular2/src/facade/lang';
import {
  ClientMessageBroker,
  UiArguments,
  ClientMessageBrokerFactory,
  ClientMessageBrokerFactory_
} from 'angular2/src/web_workers/shared/client_message_broker';
import {WebWorkerXHRImpl} from "angular2/src/web_workers/worker/xhr_impl";
import {PromiseWrapper} from "angular2/src/facade/async";

export function main() {
  describe("WebWorkerXHRImpl", () => {
    it("should pass requests through the broker and return the response",
       inject([AsyncTestCompleter], (async) => {
         const URL = "http://www.example.com/test";
         const RESPONSE = "Example response text";

         var messageBroker: any = new SpyMessageBroker();
         messageBroker.spy("runOnService")
             .andCallFake((args: UiArguments, returnType: Type) => {
               expect(args.method).toEqual("get");
               expect(args.args.length).toEqual(1);
               expect(args.args[0].value).toEqual(URL);
               return PromiseWrapper.wrap(() => { return RESPONSE; });
             });

         var xhrImpl = new WebWorkerXHRImpl(new MockMessageBrokerFactory(messageBroker));
         xhrImpl.get(URL).then((response) => {
           expect(response).toEqual(RESPONSE);
           async.done();
         });
       }));
  });
}

class MockMessageBrokerFactory extends ClientMessageBrokerFactory_ {
  constructor(private _messageBroker: ClientMessageBroker) { super(null, null); }
  createMessageBroker(channel: string, runInZone = true) { return this._messageBroker; }
}
