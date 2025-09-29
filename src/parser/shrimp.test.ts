import { expect, describe, test } from 'bun:test'

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
        Operator +
        Number 3
    `)
  })

  test('subtraction tests', () => {
    expect('5 - 2').toMatchTree(`
      BinOp
        Number 5
        Operator -
        Number 2
    `)
  })

  test('multiplication tests', () => {
    expect('4 * 3').toMatchTree(`
      BinOp
        Number 4
        Operator *
        Number 3
    `)
  })

  test('division tests', () => {
    expect('8 / 2').toMatchTree(`
      BinOp
        Number 8
        Operator /
        Number 2
    `)
  })

  test('mixed operations with precedence', () => {
    expect('2 + 3 * 4 - 5 / 1').toMatchTree(`
      BinOp
        BinOp
          Number 2
          Operator +
          BinOp
            Number 3
            Operator *
            Number 4
        Operator -
        BinOp
          Number 5
          Operator /
          Number 1
    `)
  })
})

describe('Fn', () => {
  test('parses function with single parameter', () => {
    expect('fn x: x + 1').toMatchTree(`
      Function
        Keyword fn
        Params
          Identifier x
        Colon :
        BinOp
          Identifier x
          Operator +
          Number 1`)
  })

  test('parses function with multiple parameters', () => {
    expect('fn x y: x * y').toMatchTree(`
      Function
        Keyword fn
        Params
          Identifier x
          Identifier y
        Colon :
        BinOp
          Identifier x
          Operator *
          Identifier y`)
  })

  test('parses nested functions', () => {
    expect('fn x: fn y: x + y').toMatchTree(`
      Function
        Keyword fn
        Params
          Identifier x
        Colon :
        Function
          Keyword fn
          Params
            Identifier y
          Colon :
          BinOp
            Identifier x
            Operator +
            Identifier y`)
  })
})

describe('Identifier', () => {
  test('parses hyphenated identifiers correctly', () => {
    expect('my-var - another-var').toMatchTree(`
      BinOp
        Identifier my-var
        Operator -
        Identifier another-var`)

    expect('double--trouble - another-var').toMatchTree(`
      BinOp
        Identifier double--trouble
        Operator -
        Identifier another-var`)

    expect('tail-- - another-var').toMatchTree(`
      BinOp
        Identifier tail--
        Operator -
        Identifier another-var`)
  })
})

describe('Assignment', () => {
  test('parses assignment with addition', () => {
    expect('x = 5 + 3').toMatchTree(`
      Assignment
        Identifier x
        Operator =
        BinOp
          Number 5
          Operator +
          Number 3`)
  })

  test('parses assignment with functions', () => {
    expect('add = fn a b: a + b').toMatchTree(`
      Assignment
        Identifier add
        Operator =
        Function
          Keyword fn
          Params
            Identifier a
            Identifier b
          Colon :
          BinOp
            Identifier a
            Operator +
            Identifier b`)
  })
})

describe('Parentheses', () => {
  test('parses expressions with parentheses correctly', () => {
    expect('(2 + 3) * 4').toMatchTree(`
      BinOp
        Paren (
        BinOp
          Number 2
          Operator +
          Number 3
        Paren )
        Operator *
        Number 4`)
  })

  test('parses nested parentheses correctly', () => {
    expect('((1 + 2) * (3 - 4)) / 5').toMatchTree(`
      BinOp
        Paren (
        BinOp
          Paren (
          BinOp
            Number 1
            Operator +
            Number 2
          Paren )
          Operator *
          Paren (
          BinOp
            Number 3
            Operator -
            Number 4
          Paren )
        Paren )
        Operator /
        Number 5`)
  })
})

describe('multiline', () => {
  test('parses multiline expressions', () => {
    expect(`
      5 + 4
      fn x: x - 1
    `).toMatchTree(`
      BinOp
        Number 5
        Operator +
        Number 4
      Function
        Keyword fn
        Params
          Identifier x
        Colon :
        BinOp
          Identifier x
          Operator -
          Number 1
    `)
  })
})
