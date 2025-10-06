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
      Expression
        FunctionCallOrIdentifier
          Identifier tail
    `)
  })

  test('call with arg', () => {
    expect('tail path').toMatchTree(`
      Expression
        FunctionCall
          Identifier tail
          PositionalArg
            Identifier path
    `)
  })

  test('call with arg and named arg', () => {
    expect('tail path lines=30').toMatchTree(`
      Expression
        FunctionCall
          Identifier tail
          PositionalArg
            Identifier path
          NamedArg
            Identifier lines
            Number 30
    `)
  })

  test('command with arg that is also a command', () => {
    expect('tail tail').toMatchTree(`
      Expression
        FunctionCall
          Identifier tail
          PositionalArg
            Identifier tail
    `)

    expect('tai').toMatchTree(`
      Expression
        FunctionCallOrIdentifier
          Identifier tai
    `)
  })

  test.skip('when no commands match, falls back to Identifier', () => {
    expect('omgwtf').toMatchTree(`
      Identifier omgwtf
    `)
  })

  test('Incomplete namedArg', () => {
    expect('tail lines=').toMatchTree(`
      Expression
        FunctionCall
          Identifier tail
          IncompleteNamedArg
            Identifier lines
    `)
  })
})

describe('Identifier', () => {
  test('fails on underscores and capital letters', () => {
    expect('myVar').toFailParse()
    expect('underscore_var').toFailParse()
    expect('_leadingUnderscore').toFailParse()
    expect('trailingUnderscore_').toFailParse()
    expect('mixed-123_var').toFailParse()
  })

  test('parses identifiers with emojis and dashes', () => {
    expect('moo-😊-34').toMatchTree(`
      Expression
        FunctionCallOrIdentifier
          Identifier moo-😊-34`)
  })
})

describe('Parentheses', () => {
  test('parses expressions with parentheses correctly', () => {
    expect('(2 + 3)').toMatchTree(`
      Expression
        ParenExpr
          Expression
            BinOp
              Number 2
              operator +
              Number 3`)
  })

  test('allows parens in function calls', () => {
    expect('echo (3 + 3)').toMatchTree(`
      Expression
        FunctionCall
          Identifier echo
          PositionalArg
            ParenExpr
              Expression
                BinOp
                  Number 3
                  operator +
                  Number 3`)
  })
})

describe('BinOp', () => {
  test('addition tests', () => {
    expect('2 + 3').toMatchTree(`
      Expression
        BinOp
          Number 2
          operator +
          Number 3
    `)
  })

  test('subtraction tests', () => {
    expect('5 - 2').toMatchTree(`
      Expression
        BinOp
          Number 5
          operator -
          Number 2
    `)
  })

  test('multiplication tests', () => {
    expect('4 * 3').toMatchTree(`
      Expression
        BinOp
          Number 4
          operator *
          Number 3
    `)
  })

  test('division tests', () => {
    expect('8 / 2').toMatchTree(`
      Expression
        BinOp
          Number 8
          operator /
          Number 2
    `)
  })

  test('mixed operations with precedence', () => {
    expect('2 + 3 * 4 - 5 / 1').toMatchTree(`
      Expression
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

// describe('Fn', () => {
//   test('parses function with single parameter', () => {
//     expect('fn x: x + 1').toMatchTree(`
//       Function
//         keyword fn
//         Params
//           Identifier x
//         colon :
//         BinOp
//           Identifier x
//           operator +
//           Number 1`)
//   })

//   test('parses function with multiple parameters', () => {
//     expect('fn x y: x * y').toMatchTree(`
//       Function
//         keyword fn
//         Params
//           Identifier x
//           Identifier y
//         colon :
//         BinOp
//           Identifier x
//           operator *
//           Identifier y`)
//   })

//   test('parses nested functions', () => {
//     expect('fn x: fn y: x + y').toMatchTree(`
//       Function
//         keyword fn
//         Params
//           Identifier x
//         colon :
//         Function
//           keyword fn
//           Params
//             Identifier y
//           colon :
//           BinOp
//             Identifier x
//             operator +
//             Identifier y`)
//   })
// })

// describe('Identifier', () => {
//   test('parses hyphenated identifiers correctly', () => {
//     expect('my-var').toMatchTree(`Identifier my-var`)
//     expect('double--trouble').toMatchTree(`Identifier double--trouble`)
//   })
// })

// describe('Assignment', () => {
//   test('parses assignment with addition', () => {
//     expect('x = 5 + 3').toMatchTree(`
//       Assignment
//         Identifier x
//         operator =
//         BinOp
//           Number 5
//           operator +
//           Number 3`)
//   })

//   test('parses assignment with functions', () => {
//     expect('add = fn a b: a + b').toMatchTree(`
//       Assignment
//         Identifier add
//         operator =
//         Function
//           keyword fn
//           Params
//             Identifier a
//             Identifier b
//           colon :
//           BinOp
//             Identifier a
//             operator +
//             Identifier b`)
//   })
// })
