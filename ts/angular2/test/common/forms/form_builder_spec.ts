import {
  ddescribe,
  describe,
  it,
  iit,
  xit,
  expect,
  beforeEach,
  afterEach,
  el
} from 'angular2/testing_internal';
import {Control, FormBuilder} from 'angular2/common';
import {PromiseWrapper} from 'angular2/src/facade/promise';

export function main() {
  function syncValidator(_) { return null; }
  function asyncValidator(_) { return PromiseWrapper.resolve(null); }

  describe("Form Builder", () => {
    var b;

    beforeEach(() => { b = new FormBuilder(); });

    it("should create controls from a value", () => {
      var g = b.group({"login": "some value"});

      expect(g.controls["login"].value).toEqual("some value");
    });

    it("should create controls from an array", () => {
      var g = b.group(
          {"login": ["some value"], "password": ["some value", syncValidator, asyncValidator]});

      expect(g.controls["login"].value).toEqual("some value");
      expect(g.controls["password"].value).toEqual("some value");
      expect(g.controls["password"].validator).toEqual(syncValidator);
      expect(g.controls["password"].asyncValidator).toEqual(asyncValidator);
    });

    it("should use controls", () => {
      var g = b.group({"login": b.control("some value", syncValidator, asyncValidator)});

      expect(g.controls["login"].value).toEqual("some value");
      expect(g.controls["login"].validator).toBe(syncValidator);
      expect(g.controls["login"].asyncValidator).toBe(asyncValidator);
    });

    it("should create groups with optional controls", () => {
      var g = b.group({"login": "some value"}, {"optionals": {"login": false}});

      expect(g.contains("login")).toEqual(false);
    });

    it("should create groups with a custom validator", () => {
      var g = b.group({"login": "some value"},
                      {"validator": syncValidator, "asyncValidator": asyncValidator});

      expect(g.validator).toBe(syncValidator);
      expect(g.asyncValidator).toBe(asyncValidator);
    });

    it("should create control arrays", () => {
      var c = b.control("three");
      var a = b.array(["one", ["two", syncValidator], c, b.array(['four'])], syncValidator,
                      asyncValidator);

      expect(a.value).toEqual(['one', 'two', 'three', ['four']]);
      expect(a.validator).toBe(syncValidator);
      expect(a.asyncValidator).toBe(asyncValidator);
    });
  });
}
