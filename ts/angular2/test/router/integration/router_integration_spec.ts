import {
  AsyncTestCompleter,
  beforeEach,
  beforeEachProviders,
  ddescribe,
  describe,
  expect,
  iit,
  flushMicrotasks,
  inject,
  it,
  xdescribe,
  TestComponentBuilder,
  xit,
} from 'angular2/testing_internal';

import {bootstrap} from 'angular2/bootstrap';
import {Component, Directive, View} from 'angular2/src/core/metadata';
import {DOM} from 'angular2/src/platform/dom/dom_adapter';
import {provide, ViewChild, AfterViewInit} from 'angular2/core';
import {DOCUMENT} from 'angular2/src/platform/dom/dom_tokens';
import {RouteConfig, Route, Redirect, AuxRoute} from 'angular2/src/router/route_config_decorator';
import {PromiseWrapper} from 'angular2/src/facade/async';
import {BaseException, WrappedException} from 'angular2/src/facade/exceptions';
import {
  ROUTER_PROVIDERS,
  ROUTER_PRIMARY_COMPONENT,
  RouteParams,
  Router,
  APP_BASE_HREF,
  ROUTER_DIRECTIVES,
  HashLocationStrategy
} from 'angular2/router';

import {LocationStrategy} from 'angular2/src/router/location_strategy';
import {MockLocationStrategy} from 'angular2/src/mock/mock_location_strategy';
import {ApplicationRef} from 'angular2/src/core/application_ref';
import {MockApplicationRef} from 'angular2/src/mock/mock_application_ref';

export function main() {
  describe('router injectables', () => {
    beforeEachProviders(() => {
      return [
        ROUTER_PROVIDERS,
        provide(LocationStrategy, {useClass: MockLocationStrategy}),
        provide(ApplicationRef, {useClass: MockApplicationRef})
      ];
    });

    // do not refactor out the `bootstrap` functionality. We still want to
    // keep this test around so we can ensure that bootstrapping a router works
    describe('bootstrap functionality', () => {
      it('should bootstrap a simple app', inject([AsyncTestCompleter], (async) => {
           var fakeDoc = DOM.createHtmlDocument();
           var el = DOM.createElement('app-cmp', fakeDoc);
           DOM.appendChild(fakeDoc.body, el);

           bootstrap(AppCmp,
                     [
                       ROUTER_PROVIDERS,
                       provide(ROUTER_PRIMARY_COMPONENT, {useValue: AppCmp}),
                       provide(LocationStrategy, {useClass: MockLocationStrategy}),
                       provide(DOCUMENT, {useValue: fakeDoc})
                     ])
               .then((applicationRef) => {
                 var router = applicationRef.hostComponent.router;
                 router.subscribe((_) => {
                   expect(el).toHaveText('outer { hello }');
                   expect(applicationRef.hostComponent.location.path()).toEqual('');
                   async.done();
                 });
               });
         }));
    });

    describe('broken app', () => {
      beforeEachProviders(
          () => { return [provide(ROUTER_PRIMARY_COMPONENT, {useValue: BrokenAppCmp})]; });

      it('should rethrow exceptions from component constructors',
         inject([AsyncTestCompleter, TestComponentBuilder], (async, tcb: TestComponentBuilder) => {
           tcb.createAsync(AppCmp).then((fixture) => {
             var router = fixture.debugElement.componentInstance.router;
             PromiseWrapper.catchError(router.navigateByUrl('/cause-error'), (error) => {
               expect(fixture.debugElement.nativeElement).toHaveText('outer { oh no }');
               expect(error).toContainError('oops!');
               async.done();
             });
           });
         }));
    });

    describe('back button app', () => {
      beforeEachProviders(
          () => { return [provide(ROUTER_PRIMARY_COMPONENT, {useValue: HierarchyAppCmp})]; });

      it('should change the url without pushing a new history state for back navigations',
         inject([AsyncTestCompleter, TestComponentBuilder], (async, tcb: TestComponentBuilder) => {

           tcb.createAsync(HierarchyAppCmp)
               .then((fixture) => {
                 var router = fixture.debugElement.componentInstance.router;
                 var position = 0;
                 var flipped = false;
                 var history = [
                   ['/parent/child', 'root { parent { hello } }', '/super-parent/child'],
                   ['/super-parent/child', 'root { super-parent { hello2 } }', '/parent/child'],
                   ['/parent/child', 'root { parent { hello } }', false]
                 ];

                 router.subscribe((_) => {
                   var location = fixture.debugElement.componentInstance.location;
                   var element = fixture.debugElement.nativeElement;
                   var path = location.path();

                   var entry = history[position];

                   expect(path).toEqual(entry[0]);
                   expect(element).toHaveText(entry[1]);

                   var nextUrl = entry[2];
                   if (nextUrl == false) {
                     flipped = true;
                   }

                   if (flipped && position == 0) {
                     async.done();
                     return;
                   }

                   position = position + (flipped ? -1 : 1);
                   if (flipped) {
                     location.back();
                   } else {
                     router.navigateByUrl(nextUrl);
                   }
                 });

                 router.navigateByUrl(history[0][0]);
               });
         }), 1000);
    });

    describe('hierarchical app', () => {
      beforeEachProviders(
          () => { return [provide(ROUTER_PRIMARY_COMPONENT, {useValue: HierarchyAppCmp})]; });

      it('should bootstrap an app with a hierarchy',
         inject([AsyncTestCompleter, TestComponentBuilder], (async, tcb: TestComponentBuilder) => {

           tcb.createAsync(HierarchyAppCmp)
               .then((fixture) => {
                 var router = fixture.debugElement.componentInstance.router;
                 router.subscribe((_) => {
                   expect(fixture.debugElement.nativeElement)
                       .toHaveText('root { parent { hello } }');
                   expect(fixture.debugElement.componentInstance.location.path())
                       .toEqual('/parent/child');
                   async.done();
                 });
                 router.navigateByUrl('/parent/child');
               });
         }));

      // TODO(btford): mock out level lower than LocationStrategy once that level exists
      xdescribe('custom app base ref', () => {
        beforeEachProviders(() => { return [provide(APP_BASE_HREF, {useValue: '/my/app'})]; });
        it('should bootstrap',
           inject([AsyncTestCompleter, TestComponentBuilder],
                  (async, tcb: TestComponentBuilder) => {

                    tcb.createAsync(HierarchyAppCmp)
                        .then((fixture) => {
                          var router = fixture.debugElement.componentInstance.router;
                          router.subscribe((_) => {
                            expect(fixture.debugElement.nativeElement)
                                .toHaveText('root { parent { hello } }');
                            expect(fixture.debugElement.componentInstance.location.path())
                                .toEqual('/my/app/parent/child');
                            async.done();
                          });
                          router.navigateByUrl('/parent/child');
                        });
                  }));
      });
    });
    // TODO: add a test in which the child component has bindings

    describe('querystring params app', () => {
      beforeEachProviders(
          () => { return [provide(ROUTER_PRIMARY_COMPONENT, {useValue: QueryStringAppCmp})]; });

      it('should recognize and return querystring params with the injected RouteParams',
         inject([AsyncTestCompleter, TestComponentBuilder], (async, tcb: TestComponentBuilder) => {
           tcb.createAsync(QueryStringAppCmp)
               .then((fixture) => {
                 var router = fixture.debugElement.componentInstance.router;
                 router.subscribe((_) => {
                   fixture.detectChanges();

                   expect(fixture.debugElement.nativeElement)
                       .toHaveText('qParam = search-for-something');
                   /*
                   expect(applicationRef.hostComponent.location.path())
                       .toEqual('/qs?q=search-for-something');*/
                   async.done();
                 });
                 router.navigateByUrl('/qs?q=search-for-something');
                 fixture.detectChanges();
               });
         }));
    });

    describe('retrieving components loaded via outlet via @ViewChild', () => {
      let tcb: TestComponentBuilder = null;

      beforeEachProviders(() => [provide(ROUTER_PRIMARY_COMPONENT, {useValue: AppCmp})]);

      beforeEach(inject([TestComponentBuilder],
                        (testComponentBuilder) => { tcb = testComponentBuilder; }));

      it('should get a reference and pass data to components loaded inside of outlets',
         inject([AsyncTestCompleter], (async) => {
           tcb.createAsync(AppWithViewChildren)
               .then(fixture => {
                 let appInstance = fixture.debugElement.componentInstance;
                 let router = appInstance.router;

                 router.subscribe((_) => {
                   fixture.detectChanges();

                   expect(appInstance.helloCmp).toBeAnInstanceOf(HelloCmp);
                   expect(appInstance.helloCmp.message).toBe('Ahoy');

                   async.done();
                 });

                 router.navigateByUrl('/rainbow(pony)');
               });
         }));
    });
  });
}


@Component({selector: 'hello-cmp'})
@View({template: 'hello'})
class HelloCmp {
  public message: string;
}

@Component({selector: 'hello2-cmp'})
@View({template: 'hello2'})
class Hello2Cmp {
  public greeting: string;
}

@Component({selector: 'app-cmp'})
@View({template: "outer { <router-outlet></router-outlet> }", directives: ROUTER_DIRECTIVES})
@RouteConfig([new Route({path: '/', component: HelloCmp})])
class AppCmp {
  constructor(public router: Router, public location: LocationStrategy) {}
}

@Component({
  selector: 'app-cmp',
  template: `
    Hello routing!
    <router-outlet></router-outlet>
    <router-outlet name="pony"></router-outlet>`,
  directives: ROUTER_DIRECTIVES
})
@RouteConfig([
  new Route({path: '/rainbow', component: HelloCmp}),
  new AuxRoute({name: 'pony', path: 'pony', component: Hello2Cmp})
])
class AppWithViewChildren implements AfterViewInit {
  @ViewChild(HelloCmp) helloCmp: HelloCmp;
  @ViewChild(Hello2Cmp) hello2Cmp: Hello2Cmp;

  constructor(public router: Router, public location: LocationStrategy) {}

  afterViewInit() { this.helloCmp.message = 'Ahoy'; }
}

@Component({selector: 'parent-cmp'})
@View({template: `parent { <router-outlet></router-outlet> }`, directives: ROUTER_DIRECTIVES})
@RouteConfig([new Route({path: '/child', component: HelloCmp})])
class ParentCmp {
}

@Component({selector: 'super-parent-cmp'})
@View({template: `super-parent { <router-outlet></router-outlet> }`, directives: ROUTER_DIRECTIVES})
@RouteConfig([new Route({path: '/child', component: Hello2Cmp})])
class SuperParentCmp {
}

@Component({selector: 'app-cmp'})
@View({template: `root { <router-outlet></router-outlet> }`, directives: ROUTER_DIRECTIVES})
@RouteConfig([
  new Route({path: '/parent/...', component: ParentCmp}),
  new Route({path: '/super-parent/...', component: SuperParentCmp})
])
class HierarchyAppCmp {
  constructor(public router: Router, public location: LocationStrategy) {}
}

@Component({selector: 'qs-cmp'})
@View({template: "qParam = {{q}}"})
class QSCmp {
  q: string;
  constructor(params: RouteParams) { this.q = params.get('q'); }
}

@Component({selector: 'app-cmp'})
@View({template: `<router-outlet></router-outlet>`, directives: ROUTER_DIRECTIVES})
@RouteConfig([new Route({path: '/qs', component: QSCmp})])
class QueryStringAppCmp {
  constructor(public router: Router, public location: LocationStrategy) {}
}

@Component({selector: 'oops-cmp'})
@View({template: "oh no"})
class BrokenCmp {
  constructor() { throw new BaseException('oops!'); }
}

@Component({selector: 'app-cmp'})
@View({template: `outer { <router-outlet></router-outlet> }`, directives: ROUTER_DIRECTIVES})
@RouteConfig([new Route({path: '/cause-error', component: BrokenCmp})])
class BrokenAppCmp {
  constructor(public router: Router, public location: LocationStrategy) {}
}
