import { expect, describe, test } from 'bun:test'

import '../shrimp.grammar' // Importing this so changes cause it to retest!

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
