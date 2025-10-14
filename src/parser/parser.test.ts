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
  test('allows binOps with parentheses correctly', () => {
    expect('(2 + 3)').toMatchTree(`
      ParenExpr
        BinOp
          Number 2
          operator +
          Number 3`)
  })

  test('allows numbers, strings, and booleans with parentheses correctly', () => {
    expect('(42)').toMatchTree(`
      ParenExpr
        Number 42`)

    expect("('hello')").toMatchTree(`
      ParenExpr
        String
          StringFragment hello`)

    expect('(true)').toMatchTree(`
      ParenExpr
        Boolean true`)

    expect('(false)').toMatchTree(`
      ParenExpr
        Boolean false`)
  })

  test('allows function calls in parens', () => {
    expect('(echo 3)').toMatchTree(`
      ParenExpr
        FunctionCall
          Identifier echo
          PositionalArg
            Number 3`)

    expect('(echo)').toMatchTree(`
      ParenExpr
        FunctionCallOrIdentifier
          Identifier echo`)
  })

  test('allows conditionals in parens', () => {
    expect('(a > b)').toMatchTree(`
      ParenExpr
        ConditionalOp
          Identifier a
          operator >
          Identifier b`)

    expect('(a and b)').toMatchTree(`
      ParenExpr
        ConditionalOp
          Identifier a
          operator and
          Identifier b`)
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
    expect('fn: 1 end').toMatchTree(`
      FunctionDef
        keyword fn
        Params 
        colon :
        Number 1
        end end`)
  })

  test('parses function with single parameter', () => {
    expect('fn x: x + 1 end').toMatchTree(`
      FunctionDef
        keyword fn
        Params
          Identifier x
        colon :
        BinOp
          Identifier x
          operator +
          Number 1
        end end`)
  })

  test('parses function with multiple parameters', () => {
    expect('fn x y: x * y end').toMatchTree(`
      FunctionDef
        keyword fn
        Params
          Identifier x
          Identifier y
        colon :
        BinOp
          Identifier x
          operator *
          Identifier y
        end end`)
  })

  test('parses multiline function with multiple statements', () => {
    expect(`fn x y:
  x * y
  x + 9
end`).toMatchTree(`
      FunctionDef
        keyword fn
        Params
          Identifier x
          Identifier y
        colon :
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
        operator =
        Number 5
      Assign
        Identifier y
        operator =
        Number 2`)
  })

  test('parses statements separated by semicolons', () => {
    expect(`x = 5; y = 2`).toMatchTree(`
      Assign
        Identifier x
        operator =
        Number 5
      Assign
        Identifier y
        operator =
        Number 2`)
  })

  test('parses statement with word and a semicolon', () => {
    expect(`a = hello; 2`).toMatchTree(`
      Assign
        Identifier a
        operator =
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
        operator =
        Number 5`)
  })

  test('parses assignment with addition', () => {
    expect('x = 5 + 3').toMatchTree(`
      Assign
        Identifier x
        operator =
        BinOp
          Number 5
          operator +
          Number 3`)
  })

  test('parses assignment with functions', () => {
    expect('add = fn a b: a + b end').toMatchTree(`
      Assign
        Identifier add
        operator =
        FunctionDef
          keyword fn
          Params
            Identifier a
            Identifier b
          colon :
          BinOp
            Identifier a
            operator +
            Identifier b
          end end`)
  })
})

describe('if/elsif/else', () => {
  test('parses single line if', () => {
    expect(`if y = 1: 'cool'`).toMatchTree(`
      IfExpr
        keyword if
        ConditionalOp
          Identifier y
          operator =
          Number 1
        colon :
        ThenBlock
          String
            StringFragment cool
    `)

    expect('a = if x: 2').toMatchTree(`
      Assign
        Identifier a
        operator =
        IfExpr
          keyword if
          Identifier x
          colon :
          ThenBlock
            Number 2
    `)
  })

  test('parses multiline if', () => {
    expect(`
    if x < 9:
      yes
    end`).toMatchTree(`
      IfExpr
        keyword if
        ConditionalOp
          Identifier x
          operator <
          Number 9
        colon :
        ThenBlock
          FunctionCallOrIdentifier
            Identifier yes
        end end
    `)
  })

  test('parses multiline if with else', () => {
    expect(`if with-else:
      x
    else:
      y
    end`).toMatchTree(`
      IfExpr
        keyword if
        Identifier with-else
        colon :
        ThenBlock
          FunctionCallOrIdentifier
            Identifier x
        ElseExpr
          keyword else
          colon :
          ThenBlock
            FunctionCallOrIdentifier
              Identifier y
        end end
    `)
  })

  test('parses multiline if with elsif', () => {
    expect(`if with-elsif:
      x
    elsif another-condition:
      y
    end`).toMatchTree(`
      IfExpr
        keyword if
        Identifier with-elsif
        colon :
        ThenBlock
          FunctionCallOrIdentifier
            Identifier x
        ElsifExpr
          keyword elsif
          Identifier another-condition
          colon :
          ThenBlock
            FunctionCallOrIdentifier
              Identifier y
        end end
    `)
  })

  test('parses multiline if with multiple elsif and else', () => {
    expect(`if with-elsif-else:
      x
    elsif another-condition:
      y
    elsif yet-another-condition:
      z
    else:
      oh-no
    end`).toMatchTree(`
      IfExpr
        keyword if
        Identifier with-elsif-else
        colon :
        ThenBlock
          FunctionCallOrIdentifier
            Identifier x
        ElsifExpr
          keyword elsif
          Identifier another-condition
          colon :
          ThenBlock
            FunctionCallOrIdentifier
              Identifier y
        ElsifExpr
          keyword elsif
          Identifier yet-another-condition
          colon :
          ThenBlock
            FunctionCallOrIdentifier
              Identifier z
        ElseExpr
          keyword else
          colon :
          ThenBlock
            FunctionCallOrIdentifier
              Identifier oh-no
        end end
    `)
  })
})

describe('pipe expressions', () => {
  test('simple pipe expression', () => {
    expect('echo hello | grep h').toMatchTree(`
      PipeExpr
        FunctionCall
          Identifier echo
          PositionalArg
            Identifier hello
        operator |
        FunctionCall
          Identifier grep
          PositionalArg
            Identifier h
    `)
  })

  test('multi-stage pipe chain', () => {
    expect('find files | filter active | sort').toMatchTree(`
      PipeExpr
        FunctionCall
          Identifier find
          PositionalArg
            Identifier files
        operator |
        FunctionCall
          Identifier filter
          PositionalArg
            Identifier active
        operator |
        FunctionCallOrIdentifier
          Identifier sort
    `)
  })

  test('pipe with identifier', () => {
    expect('get-value | process').toMatchTree(`
      PipeExpr
        FunctionCallOrIdentifier
          Identifier get-value
        operator |
        FunctionCallOrIdentifier
          Identifier process
    `)
  })

  test('pipe expression in assignment', () => {
    expect('result = echo hello | grep h').toMatchTree(`
      Assign
        Identifier result
        operator =
        PipeExpr
          FunctionCall
            Identifier echo
            PositionalArg
              Identifier hello
          operator |
          FunctionCall
            Identifier grep
            PositionalArg
              Identifier h
    `)
  })

  test('pipe with inline function', () => {
    expect('items | each fn x: x end').toMatchTree(`
      PipeExpr
        FunctionCallOrIdentifier
          Identifier items
        operator |
        FunctionCall
          Identifier each
          PositionalArg
            FunctionDef
              keyword fn
              Params
                Identifier x
              colon :
              FunctionCallOrIdentifier
                Identifier x
              end end
    `)
  })
})

describe('multiline', () => {
  test('parses multiline strings', () => {
    expect(`'first'\n'second'`).toMatchTree(`
      String
        StringFragment first
      String
        StringFragment second`)
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
        operator =
        FunctionDef
          keyword fn
          Params
            Identifier a
            Identifier b
          colon :
          Assign
            Identifier result
            operator =
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
        keyword fn
        Params
          Identifier x
          Identifier y
        colon :
        FunctionCallOrIdentifier
          Identifier x
        end end
    `)
  })
})

describe('string interpolation', () => {
  test('string with variable interpolation', () => {
    expect("'hello $name'").toMatchTree(`
      String
        StringFragment ${'hello '}
        Interpolation
          Identifier name
    `)
  })

  test('string with expression interpolation', () => {
    expect("'sum is $(a + b)'").toMatchTree(`
      String
        StringFragment ${'sum is '}
        Interpolation
          BinOp
            Identifier a
            operator +
            Identifier b
    `)
  })
})
