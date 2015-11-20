import {CONST_EXPR} from 'angular2/src/facade/lang';
import {provide, Provider, Injector, OpaqueToken} from 'angular2/src/core/di';

import {
  PLATFORM_DIRECTIVES,
  PLATFORM_PIPES,
  ComponentRef,
  platform,
  ExceptionHandler,
  Reflector,
  reflector,
  APPLICATION_COMMON_PROVIDERS,
  PLATFORM_COMMON_PROVIDERS,
  EVENT_MANAGER_PLUGINS,
  PLATFORM_INITIALIZER
} from "angular2/core";
import {COMMON_DIRECTIVES, COMMON_PIPES, FORM_PROVIDERS} from "angular2/common";
import {Renderer} from 'angular2/render';
import {Testability} from 'angular2/src/core/testability/testability';
import {DOM} from 'angular2/src/platform/dom/dom_adapter';
import {DomEventsPlugin} from 'angular2/src/platform/dom/events/dom_events';
import {KeyEventsPlugin} from 'angular2/src/platform/dom/events/key_events';
import {HammerGesturesPlugin} from 'angular2/src/platform/dom/events/hammer_gestures';
import {DOCUMENT} from 'angular2/src/platform/dom/dom_tokens';
import {DomRenderer, DomRenderer_} from 'angular2/src/platform/dom/dom_renderer';
import {DomSharedStylesHost} from 'angular2/src/platform/dom/shared_styles_host';
import {SharedStylesHost} from "angular2/src/platform/dom/shared_styles_host";
import {BrowserDetails} from "angular2/src/animate/browser_details";
import {AnimationBuilder} from "angular2/src/animate/animation_builder";
import {BrowserDomAdapter} from './browser/browser_adapter';
import {BrowserGetTestability} from 'angular2/src/platform/browser/testability';
import {wtfInit} from 'angular2/src/core/profile/wtf_init';
export {DOCUMENT} from 'angular2/src/platform/dom/dom_tokens';
export {Title} from 'angular2/src/platform/browser/title';
export {
  // DebugElementViewListener,
  ELEMENT_PROBE_PROVIDERS,
  ELEMENT_PROBE_BINDINGS,
  inspectNativeElement
} from 'angular2/src/platform/browser/debug/debug_element_view_listener';
export {By} from 'angular2/src/platform/browser/debug/by';
export {BrowserDomAdapter} from './browser/browser_adapter';

export const BROWSER_PROVIDERS: Array<any /*Type | Provider | any[]*/> = CONST_EXPR([
  PLATFORM_COMMON_PROVIDERS,
  new Provider(PLATFORM_INITIALIZER, {useValue: initDomAdapter, multi: true}),
]);

function _exceptionHandler(): ExceptionHandler {
  return new ExceptionHandler(DOM, false);
}

function _document(): any {
  return DOM.defaultDoc();
}

export const BROWSER_APP_COMMON_PROVIDERS: Array<any /*Type | Provider | any[]*/> = CONST_EXPR([
  APPLICATION_COMMON_PROVIDERS,
  FORM_PROVIDERS,
  new Provider(PLATFORM_PIPES, {useValue: COMMON_PIPES, multi: true}),
  new Provider(PLATFORM_DIRECTIVES, {useValue: COMMON_DIRECTIVES, multi: true}),
  new Provider(ExceptionHandler, {useFactory: _exceptionHandler, deps: []}),
  new Provider(DOCUMENT, {useFactory: _document, deps: []}),
  new Provider(EVENT_MANAGER_PLUGINS, {useClass: DomEventsPlugin, multi: true}),
  new Provider(EVENT_MANAGER_PLUGINS, {useClass: KeyEventsPlugin, multi: true}),
  new Provider(EVENT_MANAGER_PLUGINS, {useClass: HammerGesturesPlugin, multi: true}),
  new Provider(DomRenderer, {useClass: DomRenderer_}),
  new Provider(Renderer, {useExisting: DomRenderer}),
  new Provider(SharedStylesHost, {useExisting: DomSharedStylesHost}),
  DomSharedStylesHost,
  Testability,
  BrowserDetails,
  AnimationBuilder
]);

export function initDomAdapter() {
  BrowserDomAdapter.makeCurrent();
  wtfInit();
  BrowserGetTestability.init();
}