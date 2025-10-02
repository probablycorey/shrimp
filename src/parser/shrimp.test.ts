import { expect, describe, test } from 'bun:test'
import { afterEach } from 'bun:test'
import { resetCommandSource, setCommandSource } from '#editor/commands'
import { beforeEach } from 'bun:test'
import './shrimp.grammar' // Importing this so changes cause it to retest!

describe('calling commands', () => {
  beforeEach(() => {
    setCommandSource(() => [
      { command: 'tail', args: [{ name: 'path', type: 'string' }] },
      { command: 'head', args: [{ name: 'path', type: 'string' }] },
      { command: 'echo', args: [{ name: 'path', type: 'string' }] },
    ])
  })

  afterEach(() => {
    resetCommandSource()
  })

  test('basic', () => {
    expect('tail path').toMatchTree(`
      CommandCall
        Command tail
        Arg
          Identifier path
    `)

    expect('tai').toMatchTree(`
      CommandCall
        CommandPartial tai
    `)
  })

  test('command with arg that is also a command', () => {
    expect('tail tail').toMatchTree(`
      CommandCall
        Command tail
        Arg
          Identifier tail
    `)

    expect('tai').toMatchTree(`
      CommandCall
        CommandPartial tai
    `)
  })

  test('when no commands match, falls back to Identifier', () => {
    expect('omgwtf').toMatchTree(`
      Identifier omgwtf
    `)
  })

  // In shrimp.test.ts, add to the 'calling commands' section
  test('arg', () => {
    expect('tail l').toMatchTree(`    
      CommandCall
        Command tail
        Arg
          Identifier l
  `)
  })

  test('partial namedArg', () => {
    expect('tail lines=').toMatchTree(`    
      CommandCall
        Command tail
        PartialNamedArg
          NamedArgPrefix lines=
    `)
  })

  test('complete namedArg', () => {
    expect('tail lines=10').toMatchTree(`    
      CommandCall
        Command tail
        NamedArg
          NamedArgPrefix lines=
          Number 10
    `)
  })

  test('mixed positional and named args', () => {
    expect('tail ../file.txt lines=5').toMatchTree(`    
      CommandCall
        Command tail
        Arg
          UnquotedArg ../file.txt
        NamedArg
          NamedArgPrefix lines=
          Number 5
  `)
  })

  test('named args', () => {
    expect(`tail lines='5' path`).toMatchTree(`
      CommandCall
        Command tail
        NamedArg
          NamedArgPrefix lines=
          String 5
        Arg
          Identifier path
    `)
  })

  test('complex args', () => {
    expect(`tail lines=(2 + 3) filter='error' (a + b)`).toMatchTree(`
      CommandCall
        Command tail
        NamedArg
          NamedArgPrefix lines=
          paren (
          BinOp
            Number 2
            operator +
            Number 3
          paren )
        NamedArg
          NamedArgPrefix filter=
          String error
        
        Arg
          paren (
          BinOp
            Identifier a
            operator +
            Identifier b
          paren )
    `)
  })
})

describe('Identifier', () => {
  test('parses simple identifiers', () => {
    expect('hyphenated-var').toMatchTree(`Identifier hyphenated-var`)
    expect('var').toMatchTree(`Identifier var`)
    expect('var123').toMatchTree(`Identifier var123`)
  })

  test('fails on underscores and capital letters', () => {
    expect('myVar').toFailParse()
    expect('underscore_var').toFailParse()
    expect('_leadingUnderscore').toFailParse()
    expect('trailingUnderscore_').toFailParse()
    expect('mixed-123_var').toFailParse()
  })

  test('parses identifiers with emojis', () => {
    expect('var😊').toMatchTree(`Identifier var😊`)
    expect('😊').toMatchTree(`Identifier 😊`)
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
  test('parses function with single parameter', () => {
    expect('fn x: x + 1').toMatchTree(`
      Function
        keyword fn
        Params
          Identifier x
        colon :
        BinOp
          Identifier x
          operator +
          Number 1`)
  })

  test('parses function with multiple parameters', () => {
    expect('fn x y: x * y').toMatchTree(`
      Function
        keyword fn
        Params
          Identifier x
          Identifier y
        colon :
        BinOp
          Identifier x
          operator *
          Identifier y`)
  })

  test('parses nested functions', () => {
    expect('fn x: fn y: x + y').toMatchTree(`
      Function
        keyword fn
        Params
          Identifier x
        colon :
        Function
          keyword fn
          Params
            Identifier y
          colon :
          BinOp
            Identifier x
            operator +
            Identifier y`)
  })
})

describe('Identifier', () => {
  test('parses hyphenated identifiers correctly', () => {
    expect('my-var').toMatchTree(`Identifier my-var`)
    expect('double--trouble').toMatchTree(`Identifier double--trouble`)
  })
})

describe('Assignment', () => {
  test('parses assignment with addition', () => {
    expect('x = 5 + 3').toMatchTree(`
      Assignment
        Identifier x
        operator =
        BinOp
          Number 5
          operator +
          Number 3`)
  })

  test('parses assignment with functions', () => {
    expect('add = fn a b: a + b').toMatchTree(`
      Assignment
        Identifier add
        operator =
        Function
          keyword fn
          Params
            Identifier a
            Identifier b
          colon :
          BinOp
            Identifier a
            operator +
            Identifier b`)
  })
})

describe('Parentheses', () => {
  test('parses expressions with parentheses correctly', () => {
    expect('(2 + 3) * 4').toMatchTree(`
      BinOp
        paren (
        BinOp
          Number 2
          operator +
          Number 3
        paren )
        operator *
        Number 4`)
  })

  test('parses nested parentheses correctly', () => {
    expect('((1 + 2) * (3 - 4)) / 5').toMatchTree(`
      BinOp
        paren (
        BinOp
          paren (
          BinOp
            Number 1
            operator +
            Number 2
          paren )
          operator *
          paren (
          BinOp
            Number 3
            operator -
            Number 4
          paren )
        paren )
        operator /
        Number 5`)
  })
})
