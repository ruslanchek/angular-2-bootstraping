import {ddescribe, describe, it, xit, iit, expect, beforeEach} from 'angular2/testing_internal';
import {isBlank, isPresent} from 'angular2/src/facade/lang';
import {reflector} from 'angular2/src/core/reflection/reflection';
import {Parser} from 'angular2/src/core/change_detection/parser/parser';
import {Unparser} from './unparser';
import {Lexer} from 'angular2/src/core/change_detection/parser/lexer';
import {BindingPipe, LiteralPrimitive, AST} from 'angular2/src/core/change_detection/parser/ast';

export function main() {
  function createParser() { return new Parser(new Lexer(), reflector); }

  function parseAction(text, location = null): any {
    return createParser().parseAction(text, location);
  }

  function parseBinding(text, location = null): any {
    return createParser().parseBinding(text, location);
  }

  function parseTemplateBindings(text, location = null): any {
    return createParser().parseTemplateBindings(text, location);
  }

  function parseInterpolation(text, location = null): any {
    return createParser().parseInterpolation(text, location);
  }

  function parseSimpleBinding(text, location = null): any {
    return createParser().parseSimpleBinding(text, location);
  }

  function unparse(ast: AST): string { return new Unparser().unparse(ast); }

  function checkBinding(exp: string, expected?: string) {
    var ast = parseBinding(exp);
    if (isBlank(expected)) expected = exp;
    expect(unparse(ast)).toEqual(expected);
  }

  function checkAction(exp: string, expected?: string) {
    var ast = parseAction(exp);
    if (isBlank(expected)) expected = exp;
    expect(unparse(ast)).toEqual(expected);
  }

  function expectActionError(text) { return expect(() => parseAction(text)); }

  function expectBindingError(text) { return expect(() => parseBinding(text)); }

  describe("parser", () => {
    describe("parseAction", () => {
      it('should parse numbers', () => { checkAction("1"); });

      it('should parse strings', () => {
        checkAction("'1'", '"1"');
        checkAction('"1"');
      });

      it('should parse null', () => { checkAction("null"); });

      it('should parse unary - expressions', () => {
        checkAction("-1", "0 - 1");
        checkAction("+1", "1");
      });

      it('should parse unary ! expressions', () => {
        checkAction("!true");
        checkAction("!!true");
        checkAction("!!!true");
      });

      it('should parse multiplicative expressions',
         () => { checkAction("3*4/2%5", "3 * 4 / 2 % 5"); });

      it('should parse additive expressions', () => { checkAction("3 + 6 - 2"); });

      it('should parse relational expressions', () => {
        checkAction("2 < 3");
        checkAction("2 > 3");
        checkAction("2 <= 2");
        checkAction("2 >= 2");
      });

      it('should parse equality expressions', () => {
        checkAction("2 == 3");
        checkAction("2 != 3");
      });

      it('should parse strict equality expressions', () => {
        checkAction("2 === 3");
        checkAction("2 !== 3");
      });

      it('should parse expressions', () => {
        checkAction("true && true");
        checkAction("true || false");
      });

      it('should parse grouped expressions', () => { checkAction("(1 + 2) * 3", "1 + 2 * 3"); });

      it('should parse an empty string', () => { checkAction(''); });

      describe("literals", () => {
        it('should parse array', () => {
          checkAction("[1][0]");
          checkAction("[[1]][0][0]");
          checkAction("[]");
          checkAction("[].length");
          checkAction("[1, 2].length");
        });

        it('should parse map', () => {
          checkAction("{}");
          checkAction("{a: 1}[2]");
          checkAction("{}[\"a\"]");
        });

        it('should only allow identifier, string, or keyword as map key', () => {
          expectActionError('{(:0}')
              .toThrowError(new RegExp('expected identifier, keyword, or string'));
          expectActionError('{1234:0}')
              .toThrowError(new RegExp('expected identifier, keyword, or string'));
        });
      });

      describe("member access", () => {
        it("should parse field access", () => {
          checkAction("a");
          checkAction("a.a");
        });

        it('should only allow identifier or keyword as member names', () => {
          expectActionError('x.(').toThrowError(new RegExp('identifier or keyword'));
          expectActionError('x. 1234').toThrowError(new RegExp('identifier or keyword'));
          expectActionError('x."foo"').toThrowError(new RegExp('identifier or keyword'));
        });

        it('should parse safe field access', () => {
          checkAction('a?.a');
          checkAction('a.a?.a');
        });
      });

      describe("method calls", () => {
        it("should parse method calls", () => {
          checkAction("fn()");
          checkAction("add(1, 2)");
          checkAction("a.add(1, 2)");
          checkAction("fn().add(1, 2)");
        });
      });

      describe("functional calls",
               () => { it("should parse function calls", () => { checkAction("fn()(1, 2)"); }); });

      describe("conditional", () => {
        it('should parse ternary/conditional expressions', () => {
          checkAction("7 == 3 + 4 ? 10 : 20");
          checkAction("false ? 10 : 20");
        });

        it('should throw on incorrect ternary operator syntax', () => {
          expectActionError("true?1").toThrowError(new RegExp(
              'Parser Error: Conditional expression true\\?1 requires all 3 expressions'));
        });
      });

      describe("assignment", () => {
        it("should support field assignments", () => {
          checkAction("a = 12");
          checkAction("a.a.a = 123");
          checkAction("a = 123; b = 234;");
        });

        it("should throw on safe field assignments", () => {
          expectActionError("a?.a = 123")
              .toThrowError(new RegExp('cannot be used in the assignment'));
        });

        it("should support array updates", () => { checkAction("a[0] = 200"); });
      });

      it("should error when using pipes",
         () => { expectActionError('x|blah').toThrowError(new RegExp('Cannot have a pipe')); });

      it('should store the source in the result',
         () => { expect(parseAction('someExpr').source).toBe('someExpr'); });

      it('should store the passed-in location',
         () => { expect(parseAction('someExpr', 'location').location).toBe('location'); });

      it("should throw when encountering interpolation", () => {
        expectActionError("{{a()}}")
            .toThrowErrorWith('Got interpolation ({{}}) where expression was expected');
      });
    });

    describe("general error handling", () => {
      it("should throw on an unexpected token", () => {
        expectActionError("[1,2] trac").toThrowError(new RegExp('Unexpected token \'trac\''));
      });

      it('should throw a reasonable error for unconsumed tokens', () => {
        expectActionError(")")
            .toThrowError(new RegExp("Unexpected token \\) at column 1 in \\[\\)\\]"));
      });

      it('should throw on missing expected token', () => {
        expectActionError("a(b").toThrowError(
            new RegExp("Missing expected \\) at the end of the expression \\[a\\(b\\]"));
      });
    });

    describe("parseBinding", () => {
      describe("pipes", () => {
        it("should parse pipes", () => {
          checkBinding('a(b | c)', 'a((b | c))');
          checkBinding('a.b(c.d(e) | f)', 'a.b((c.d(e) | f))');
          checkBinding('[1, 2, 3] | a', '([1, 2, 3] | a)');
          checkBinding('{a: 1} | b', '({a: 1} | b)');
          checkBinding('a[b] | c', '(a[b] | c)');
          checkBinding('a?.b | c', '(a?.b | c)');
          checkBinding('true | a', '(true | a)');
          checkBinding('a | b:c | d', '((a | b:c) | d)');
          checkBinding('a | b:(c | d)', '(a | b:(c | d))');
        });

        it('should only allow identifier or keyword as formatter names', () => {
          expectBindingError('"Foo"|(').toThrowError(new RegExp('identifier or keyword'));
          expectBindingError('"Foo"|1234').toThrowError(new RegExp('identifier or keyword'));
          expectBindingError('"Foo"|"uppercase"').toThrowError(new RegExp('identifier or keyword'));
        });
      });

      it('should store the source in the result',
         () => { expect(parseBinding('someExpr').source).toBe('someExpr'); });

      it('should store the passed-in location',
         () => { expect(parseBinding('someExpr', 'location').location).toBe('location'); });

      it('should throw on chain expressions', () => {
        expect(() => parseBinding("1;2")).toThrowError(new RegExp("contain chained expression"));
      });

      it('should throw on assignment', () => {
        expect(() => parseBinding("a=2")).toThrowError(new RegExp("contain assignments"));
      });

      it('should throw when encountering interpolation', () => {
        expectBindingError("{{a.b}}")
            .toThrowErrorWith('Got interpolation ({{}}) where expression was expected');
      });
    });

    describe('parseTemplateBindings', () => {

      function keys(templateBindings: any[]) {
        return templateBindings.map(binding => binding.key);
      }

      function keyValues(templateBindings: any[]) {
        return templateBindings.map(binding => {
          if (binding.keyIsVar) {
            return '#' + binding.key + (isBlank(binding.name) ? '=null' : '=' + binding.name);
          } else {
            return binding.key + (isBlank(binding.expression) ? '' : `=${binding.expression}`)
          }
        });
      }

      function exprSources(templateBindings: any[]) {
        return templateBindings.map(
            binding => isPresent(binding.expression) ? binding.expression.source : null);
      }

      it('should parse an empty string', () => { expect(parseTemplateBindings('')).toEqual([]); });

      it('should parse a string without a value',
         () => { expect(keys(parseTemplateBindings('a'))).toEqual(['a']); });

      it('should only allow identifier, string, or keyword including dashes as keys', () => {
        var bindings = parseTemplateBindings("a:'b'");
        expect(keys(bindings)).toEqual(['a']);

        bindings = parseTemplateBindings("'a':'b'");
        expect(keys(bindings)).toEqual(['a']);

        bindings = parseTemplateBindings("\"a\":'b'");
        expect(keys(bindings)).toEqual(['a']);

        bindings = parseTemplateBindings("a-b:'c'");
        expect(keys(bindings)).toEqual(['a-b']);

        expect(() => { parseTemplateBindings('(:0'); })
            .toThrowError(new RegExp('expected identifier, keyword, or string'));

        expect(() => { parseTemplateBindings('1234:0'); })
            .toThrowError(new RegExp('expected identifier, keyword, or string'));
      });

      it('should detect expressions as value', () => {
        var bindings = parseTemplateBindings("a:b");
        expect(exprSources(bindings)).toEqual(['b']);

        bindings = parseTemplateBindings("a:1+1");
        expect(exprSources(bindings)).toEqual(['1+1']);
      });

      it('should detect names as value', () => {
        var bindings = parseTemplateBindings("a:#b");
        expect(keyValues(bindings)).toEqual(['a', '#b=\$implicit']);
      });

      it('should allow space and colon as separators', () => {
        var bindings = parseTemplateBindings("a:b");
        expect(keys(bindings)).toEqual(['a']);
        expect(exprSources(bindings)).toEqual(['b']);

        bindings = parseTemplateBindings("a b");
        expect(keys(bindings)).toEqual(['a']);
        expect(exprSources(bindings)).toEqual(['b']);
      });

      it('should allow multiple pairs', () => {
        var bindings = parseTemplateBindings("a 1 b 2");
        expect(keys(bindings)).toEqual(['a', 'a-b']);
        expect(exprSources(bindings)).toEqual(['1 ', '2']);
      });

      it('should store the sources in the result', () => {
        var bindings = parseTemplateBindings("a 1,b 2");
        expect(bindings[0].expression.source).toEqual('1');
        expect(bindings[1].expression.source).toEqual('2');
      });

      it('should store the passed-in location', () => {
        var bindings = parseTemplateBindings("a 1,b 2", 'location');
        expect(bindings[0].expression.location).toEqual('location');
      });

      it('should support var/# notation', () => {
        var bindings = parseTemplateBindings("var i");
        expect(keyValues(bindings)).toEqual(['#i=\$implicit']);

        bindings = parseTemplateBindings("#i");
        expect(keyValues(bindings)).toEqual(['#i=\$implicit']);

        bindings = parseTemplateBindings("var a; var b");
        expect(keyValues(bindings)).toEqual(['#a=\$implicit', '#b=\$implicit']);

        bindings = parseTemplateBindings("#a; #b;");
        expect(keyValues(bindings)).toEqual(['#a=\$implicit', '#b=\$implicit']);

        bindings = parseTemplateBindings("var i-a = k-a");
        expect(keyValues(bindings)).toEqual(['#i-a=k-a']);

        bindings = parseTemplateBindings("keyword var item; var i = k");
        expect(keyValues(bindings)).toEqual(['keyword', '#item=\$implicit', '#i=k']);

        bindings = parseTemplateBindings("keyword: #item; #i = k");
        expect(keyValues(bindings)).toEqual(['keyword', '#item=\$implicit', '#i=k']);

        bindings = parseTemplateBindings("directive: var item in expr; var a = b", 'location');
        expect(keyValues(bindings))
            .toEqual(['directive', '#item=\$implicit', 'directive-in=expr in location', '#a=b']);
      });

      it('should parse pipes', () => {
        var bindings = parseTemplateBindings('key value|pipe');
        var ast = bindings[0].expression.ast;
        expect(ast).toBeAnInstanceOf(BindingPipe);
      });
    });

    describe('parseInterpolation', () => {
      it('should return null if no interpolation',
         () => { expect(parseInterpolation('nothing')).toBe(null); });

      it('should parse no prefix/suffix interpolation', () => {
        var ast = parseInterpolation('{{a}}').ast;
        expect(ast.strings).toEqual(['', '']);
        expect(ast.expressions.length).toEqual(1);
        expect(ast.expressions[0].name).toEqual('a');
      });

      it('should parse prefix/suffix with multiple interpolation', () => {
        var originalExp = 'before {{ a }} middle {{ b }} after';
        var ast = parseInterpolation(originalExp).ast;
        expect(new Unparser().unparse(ast)).toEqual(originalExp);
      });

      it("should throw on empty interpolation expressions", () => {
        expect(() => parseInterpolation("{{}}"))
            .toThrowErrorWith(
                "Parser Error: Blank expressions are not allowed in interpolated strings");

        expect(() => parseInterpolation("foo {{  }}"))
            .toThrowErrorWith(
                "Parser Error: Blank expressions are not allowed in interpolated strings");
      });
    });

    describe("parseSimpleBinding", () => {
      it("should parse a field access", () => {
        var p = parseSimpleBinding("name");
        expect(unparse(p)).toEqual("name");
      });

      it("should parse a constant", () => {
        var p = parseSimpleBinding("[1, 2]");
        expect(unparse(p)).toEqual("[1, 2]");
      });

      it("should throw when the given expression is not just a field name", () => {
        expect(() => parseSimpleBinding("name + 1"))
            .toThrowErrorWith(
                'Simple binding expression can only contain field access and constants');
      });

      it('should throw when encountering interpolation', () => {
        expect(() => parseSimpleBinding('{{exp}}'))
            .toThrowErrorWith('Got interpolation ({{}}) where expression was expected');
      });
    });

    describe('wrapLiteralPrimitive', () => {
      it('should wrap a literal primitive', () => {
        expect(unparse(createParser().wrapLiteralPrimitive("foo", null))).toEqual('"foo"');
      });
    });
  });
}
