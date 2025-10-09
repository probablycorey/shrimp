import { expect, describe, test } from 'bun:test'
import { afterEach } from 'bun:test'
import { resetCommandSource, setCommandSource } from '#editor/commands'
import { beforeEach } from 'bun:test'
import './shrimp.grammar' // Importing this so changes cause it to retest!

describe('calling functions', () => {
  beforeEach(() => {
    setCommandSource(() => [
      {
        command: 'echo',
        args: [{ name: 'path', type: 'string' }],
        execute: (p: any) => p,
      },
    ])
  })

  afterEach(() => {
    resetCommandSource()
  })

  test('call with no args', () => {
    expect('tail').toMatchTree(`
      FunctionCallOrIdentifier
        Identifier tail
    `)
  })

  test('call with arg', () => {
    expect('tail path').toMatchTree(`
      FunctionCall
        Identifier tail
        PositionalArg
          Identifier path
    `)
  })

  test('call with arg and named arg', () => {
    expect('tail path lines=30').toMatchTree(`
      FunctionCall
        Identifier tail
        PositionalArg
          Identifier path
        NamedArg
          NamedArgPrefix lines=
          Number 30
    `)
  })

  test('command with arg that is also a command', () => {
    expect('tail tail').toMatchTree(`
      FunctionCall
        Identifier tail
        PositionalArg
          Identifier tail
    `)

    expect('tai').toMatchTree(`
      FunctionCallOrIdentifier
        Identifier tai
    `)
  })

  test('Incomplete namedArg', () => {
    expect('tail lines=').toMatchTree(`
      FunctionCall
        Identifier tail
        NamedArg
          NamedArgPrefix lines=
          ⚠ 
      ⚠ `)
  })
})

describe('Identifier', () => {
  test('parses identifiers with emojis and dashes', () => {
    expect('moo-😊-34').toMatchTree(`
      FunctionCallOrIdentifier
        Identifier moo-😊-34`)
  })
})

describe('Parentheses', () => {
  test('parses expressions with parentheses correctly', () => {
    expect('(2 + 3)').toMatchTree(`
      ParenExpr
        BinOp
          Number 2
          operator +
          Number 3`)
  })

  test('allows parens in function calls', () => {
    expect('echo (3 + 3)').toMatchTree(`
      FunctionCall
        Identifier echo
        PositionalArg
          ParenExpr
            BinOp
              Number 3
              operator +
              Number 3`)
  })

  test('a word can be contained in parens', () => {
    expect('(basename ./cool)').toMatchTree(`
      ParenExpr
        FunctionCall
          Identifier basename
          PositionalArg
            Word ./cool
      `)
  })

  test('nested parentheses', () => {
    expect('(2 + (1 * 4))').toMatchTree(`
      ParenExpr
        BinOp
          Number 2
          operator +
          ParenExpr
            BinOp
              Number 1
              operator *
              Number 4`)
  })

  test('Function in parentheses', () => {
    expect('4 + (echo 3)').toMatchTree(`
      BinOp
        Number 4
        operator +
        ParenExpr
          FunctionCall
            Identifier echo
            PositionalArg
              Number 3`)
  })
})

describe('BinOp', () => {
  test('addition tests', () => {
    expect('2 + 3').toMatchTree(`
      BinOp
        Number 2
        operator +
        Number 3
    `)
  })

  test('subtraction tests', () => {
    expect('5 - 2').toMatchTree(`
      BinOp
        Number 5
        operator -
        Number 2
    `)
  })

  test('multiplication tests', () => {
    expect('4 * 3').toMatchTree(`
      BinOp
        Number 4
        operator *
        Number 3
    `)
  })

  test('division tests', () => {
    expect('8 / 2').toMatchTree(`
      BinOp
        Number 8
        operator /
        Number 2
    `)
  })

  test('mixed operations with precedence', () => {
    expect('2 + 3 * 4 - 5 / 1').toMatchTree(`
      BinOp
        BinOp
          Number 2
          operator +
          BinOp
            Number 3
            operator *
            Number 4
        operator -
        BinOp
          Number 5
          operator /
          Number 1
    `)
  })
})

describe('Fn', () => {
  test('parses function no parameters', () => {
    expect('fn: 1').toMatchTree(`
      FunctionDef
        fn fn
        Params 
        : :
        Number 1`)
  })

  test('parses function with single parameter', () => {
    expect('fn x: x + 1').toMatchTree(`
      FunctionDef
        fn fn
        Params
          Identifier x
        : :
        BinOp
          Identifier x
          operator +
          Number 1`)
  })

  test('parses function with multiple parameters', () => {
    expect('fn x y: x * y').toMatchTree(`
      FunctionDef
        fn fn
        Params
          Identifier x
          Identifier y
        : :
        BinOp
          Identifier x
          operator *
          Identifier y`)
  })

  test('parses multiline function with multiple statements', () => {
    expect(`fn x y:
  x * y
  x + 9
end`).toMatchTree(`
      FunctionDef
        fn fn
        Params
          Identifier x
          Identifier y
        : :
        BinOp
          Identifier x
          operator *
          Identifier y
        BinOp
          Identifier x
          operator +
          Number 9
        end end`)
  })
})

describe('ambiguity', () => {
  test('parses ambiguous expressions correctly', () => {
    expect('a + -3').toMatchTree(`
      BinOp
        Identifier a
        operator +
        Number -3
    `)
  })

  test('parses ambiguous expressions correctly', () => {
    expect('a-var + a-thing').toMatchTree(`
      BinOp
        Identifier a-var
        operator +
        Identifier a-thing
    `)
  })
})

describe('newlines', () => {
  test('parses multiple statements separated by newlines', () => {
    expect(`x = 5
y = 2`).toMatchTree(`
      Assign
        Identifier x
        = =
        Number 5
      Assign
        Identifier y
        = =
        Number 2`)
  })

  test('parses statements separated by semicolons', () => {
    expect(`x = 5; y = 2`).toMatchTree(`
      Assign
        Identifier x
        = =
        Number 5
      Assign
        Identifier y
        = =
        Number 2`)
  })

  test('parses statement with word and a semicolon', () => {
    expect(`a = hello; 2`).toMatchTree(`
      Assign
        Identifier a
        = =
        FunctionCallOrIdentifier
          Identifier hello
      Number 2`)
  })
})

describe('Assign', () => {
  test('parses simple assignment', () => {
    expect('x = 5').toMatchTree(`
      Assign
        Identifier x
        = =
        Number 5`)
  })

  test('parses assignment with addition', () => {
    expect('x = 5 + 3').toMatchTree(`
      Assign
        Identifier x
        = =
        BinOp
          Number 5
          operator +
          Number 3`)
  })

  test('parses assignment with functions', () => {
    expect('add = fn a b: a + b').toMatchTree(`
      Assign
        Identifier add
        = =
        FunctionDef
          fn fn
          Params
            Identifier a
            Identifier b
          : :
          BinOp
            Identifier a
            operator +
            Identifier b`)
  })
})

describe('multiline', () => {
  test('parses multiline strings', () => {
    expect(`'first'\n'second'`).toMatchTree(`
      String first
      String second`)
  })

  test('parses multiline functions', () => {
    expect(`
      add = fn a b:
        result = a + b
        result
      end

      add 3 4
    `).toMatchTree(`
      Assign
        Identifier add
        = =
        FunctionDef
          fn fn
          Params
            Identifier a
            Identifier b
          : :
          Assign
            Identifier result
            = =
            BinOp
              Identifier a
              operator +
              Identifier b
          FunctionCallOrIdentifier
            Identifier result

          end end
      FunctionCall
        Identifier add
        PositionalArg
          Number 3
        PositionalArg
          Number 4`)
  })

  test('ignores leading and trailing whitespace in expected tree', () => {
    expect(`
      3


      fn x y:
  x
end

`).toMatchTree(`
      Number 3

      FunctionDef
        fn fn
        Params
          Identifier x
          Identifier y
        : :
        FunctionCallOrIdentifier
          Identifier x
        end end
    `)
  })
})
