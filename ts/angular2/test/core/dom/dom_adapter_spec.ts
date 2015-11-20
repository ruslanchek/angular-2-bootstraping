import {
  AsyncTestCompleter,
  beforeEach,
  ddescribe,
  describe,
  el,
  expect,
  iit,
  inject,
  it,
  xit,
  beforeEachBindings,
  SpyObject,
  stringifyElement
} from 'angular2/testing_internal';

import {DOM} from 'angular2/src/platform/dom/dom_adapter';

export function main() {
  describe('dom adapter', () => {
    it('should not coalesque text nodes', () => {
      var el1 = el('<div>a</div>');
      var el2 = el('<div>b</div>');
      DOM.appendChild(el2, DOM.firstChild(el1));
      expect(DOM.childNodes(el2).length).toBe(2);

      var el2Clone = DOM.clone(el2);
      expect(DOM.childNodes(el2Clone).length).toBe(2);
    });

    it('should clone correctly', () => {
      var el1 = el('<div x="y">a<span>b</span></div>');
      var clone = DOM.clone(el1);

      expect(clone).not.toBe(el1);
      DOM.setAttribute(clone, 'test', '1');
      expect(stringifyElement(clone)).toEqual('<div test="1" x="y">a<span>b</span></div>');
      expect(DOM.getAttribute(el1, 'test')).toBeFalsy();

      var cNodes = DOM.childNodes(clone);
      var firstChild = cNodes[0];
      var secondChild = cNodes[1];
      expect(DOM.parentElement(firstChild)).toBe(clone);
      expect(DOM.nextSibling(firstChild)).toBe(secondChild);
      expect(DOM.isTextNode(firstChild)).toBe(true);

      expect(DOM.parentElement(secondChild)).toBe(clone);
      expect(DOM.nextSibling(secondChild)).toBeFalsy();
      expect(DOM.isElementNode(secondChild)).toBe(true);

    });

    it('should be able to create text nodes and use them with the other APIs', () => {
      var t = DOM.createTextNode('hello');
      expect(DOM.isTextNode(t)).toBe(true);
      var d = DOM.createElement('div');
      DOM.appendChild(d, t);
      expect(DOM.getInnerHTML(d)).toEqual('hello');
    });

    it('should set className via the class attribute', () => {
      var d = DOM.createElement('div');
      DOM.setAttribute(d, 'class', 'class1');
      expect(d.className).toEqual('class1');
    });

    it('should allow to remove nodes without parents', () => {
      var d = DOM.createElement('div');
      expect(() => DOM.remove(d)).not.toThrow();
    });

    if (DOM.supportsDOMEvents()) {
      describe('getBaseHref', () => {
        beforeEach(() => DOM.resetBaseElement());

        it('should return null if base element is absent',
           () => { expect(DOM.getBaseHref()).toBeNull(); });

        it('should return the value of the base element', () => {
          var baseEl = DOM.createElement('base');
          DOM.setAttribute(baseEl, 'href', '/drop/bass/connon/');
          var headEl = DOM.defaultDoc().head;
          DOM.appendChild(headEl, baseEl);

          var baseHref = DOM.getBaseHref();
          DOM.removeChild(headEl, baseEl);
          DOM.resetBaseElement();

          expect(baseHref).toEqual('/drop/bass/connon/');
        });

        it('should return a relative url', () => {
          var baseEl = DOM.createElement('base');
          DOM.setAttribute(baseEl, 'href', 'base');
          var headEl = DOM.defaultDoc().head;
          DOM.appendChild(headEl, baseEl);

          var baseHref = DOM.getBaseHref();
          DOM.removeChild(headEl, baseEl);
          DOM.resetBaseElement();

          expect(baseHref).toEqual('/base');
        });
      });
    }


  });
}
