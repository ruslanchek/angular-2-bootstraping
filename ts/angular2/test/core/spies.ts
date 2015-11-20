import {
  ChangeDetector,
  ChangeDetectorRef,
  ProtoChangeDetector,
  DynamicChangeDetector
} from 'angular2/src/core/change_detection/change_detection';

import {Renderer, RenderEventDispatcher} from 'angular2/src/core/render/api';
import {DirectiveResolver} from 'angular2/src/core/linker/directive_resolver';

import {AppView} from 'angular2/src/core/linker/view';
import {ElementRef} from 'angular2/src/core/linker/element_ref';
import {AppViewManager} from 'angular2/src/core/linker/view_manager';
import {AppViewPool} from 'angular2/src/core/linker/view_pool';
import {AppViewListener} from 'angular2/src/core/linker/view_listener';
import {ProtoViewFactory} from 'angular2/src/core/linker/proto_view_factory';
import {DomAdapter} from 'angular2/src/platform/dom/dom_adapter';
import {ClientMessageBroker} from 'angular2/src/web_workers/shared/client_message_broker';

import {
  ElementInjector,
  PreBuiltObjects,
  ProtoElementInjector
} from 'angular2/src/core/linker/element_injector';

import {SpyObject, proxy} from 'angular2/testing_internal';

export class SpyDependencyProvider extends SpyObject {}

export class SpyChangeDetector extends SpyObject {
  constructor() { super(DynamicChangeDetector); }
}

export class SpyChangeDispatcher extends SpyObject {}

export class SpyIterableDifferFactory extends SpyObject {}

export class SpyDirectiveResolver extends SpyObject {
  constructor() { super(DirectiveResolver); }
}

export class SpyView extends SpyObject {
  constructor() { super(AppView); }
}

export class SpyElementRef extends SpyObject {
  constructor() { super(ElementRef); }
}

export class SpyAppViewManager extends SpyObject {
  constructor() { super(AppViewManager); }
}

export class SpyRenderer extends SpyObject {
  constructor() {
    // Note: Renderer is an abstract class,
    // so we can't generates spy functions automatically
    // by inspecting the prototype...
    super(Renderer);
    this.spy('setEventDispatcher');
    this.spy('destroyView');
    this.spy('createView');
    this.spy('createProtoView');
    this.spy('hydrateView');
    this.spy('dehydrateView');
    this.spy('attachFragmentAfterElement');
    this.spy('attachFragmentAfterFragment');
    this.spy('detachFragment');
  }
}

export class SpyAppViewPool extends SpyObject {
  constructor() { super(AppViewPool); }
}

export class SpyAppViewListener extends SpyObject {
  constructor() { super(AppViewListener); }
}

export class SpyProtoViewFactory extends SpyObject {
  constructor() { super(ProtoViewFactory); }
}

export class SpyProtoElementInjector extends SpyObject {
  constructor() { super(ProtoElementInjector); }
}

export class SpyElementInjector extends SpyObject {
  constructor() { super(ElementInjector); }
}

export class SpyPreBuiltObjects extends SpyObject {
  constructor() { super(PreBuiltObjects); }
}

export class SpyDomAdapter extends SpyObject {
  constructor() { super(DomAdapter); }
}

export class SpyRenderEventDispatcher extends SpyObject {
  constructor() {
    // Note: RenderEventDispatcher is an interface,
    // so we can't pass it to super() and have to register
    // the spy methods on our own.
    super();
    this.spy('dispatchRenderEvent');
  }
}