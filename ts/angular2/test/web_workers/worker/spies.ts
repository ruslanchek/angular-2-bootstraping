import {ClientMessageBroker} from 'angular2/src/web_workers/shared/client_message_broker';

import {SpyObject, proxy} from 'angular2/testing_internal';

export class SpyMessageBroker extends SpyObject {
  constructor() { super(ClientMessageBroker); }
}
