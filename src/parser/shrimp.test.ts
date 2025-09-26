import { expectTree, regenerateParser } from '@/parser/test-helper'
import { beforeAll, describe, test } from 'bun:test'

describe('BinOp', () => {
  beforeAll(() => regenerateParser())

  test('addition tests', () => {
    expectTree('2 + 3').toMatch(`
      BinOp
        Number 2
        +
        Number 3
    `)
  })

  test('subtraction tests', () => {
    expectTree('5 - 2').toMatch(`
      BinOp
        Number 5
        -
        Number 2
    `)
  })

  test('multiplication tests', () => {
    expectTree('4 * 3').toMatch(`
      BinOp
        Number 4
        *
        Number 3
    `)
  })

  test('division tests', () => {
    expectTree('8 / 2').toMatch(`
      BinOp
        Number 8
        /
        Number 2
    `)
  })

  test('mixed operations with precedence', () => {
    expectTree('2 + 3 * 4 - 5 / 1').toMatch(`
      BinOp
        BinOp
          Number 2
          +
          BinOp
            Number 3
            *
            Number 4
        -
        BinOp
          Number 5
          /
          Number 1
    `)
  })
})

describe('Fn', () => {
  beforeAll(() => regenerateParser())

  test('parses function with single parameter', () => {
    expectTree('fn x -> x + 1').toMatch(`
      Function
        Params
          Identifier x
        BinOp
          Identifier x
          +
          Number 1`)
  })

  test('parses function with multiple parameters', () => {
    expectTree('fn x y -> x * y').toMatch(`
      Function
        Params
          Identifier x
          Identifier y
        BinOp
          Identifier x
          *
          Identifier y`)
  })

  test('parses nested functions', () => {
    expectTree('fn x -> fn y -> x + y').toMatch(`
      Function
        Params
          Identifier x
        Function
          Params
            Identifier y
          BinOp
            Identifier x
            +
            Identifier y`)
  })
})

describe('Identifier', () => {
  beforeAll(() => regenerateParser())

  test('parses hyphenated identifiers correctly', () => {
    expectTree('my-var - another-var').toMatch(`
      BinOp
        Identifier my-var
        -
        Identifier another-var`)

    expectTree('double--trouble - another-var').toMatch(`
      BinOp
        Identifier double--trouble
        -
        Identifier another-var`)

    expectTree('tail-- - another-var').toMatch(`
      BinOp
        Identifier tail--
        -
        Identifier another-var`)
  })
})

describe('Assignment', () => {
  beforeAll(() => regenerateParser())

  test('parses assignment with addition', () => {
    expectTree('x = 5 + 3').toMatch(`
      Assignment
        Identifier x
        BinOp
          Number 5
          +
          Number 3`)
  })

  test('parses assignment with functions', () => {
    expectTree('add = fn a b -> a + b').toMatch(`
      Assignment
        Identifier add
        Function
          Params
            Identifier a
            Identifier b
          BinOp
            Identifier a
            +
            Identifier b`)
  })
})

describe('Parentheses', () => {
  beforeAll(() => regenerateParser())

  test('parses expressions with parentheses correctly', () => {
    expectTree('(2 + 3) * 4').toMatch(`
      BinOp
        BinOp
          Number 2
          +
          Number 3
        *
        Number 4`)
  })

  test('parses nested parentheses correctly', () => {
    expectTree('((1 + 2) * (3 - 4)) / 5').toMatch(`
      BinOp
        BinOp
          BinOp
            Number 1
            +
            Number 2
          *
          BinOp
            Number 3
            -
            Number 4
        /
        Number 5`)
  })
})

describe('multiline', () => {
  beforeAll(() => regenerateParser())

  test('parses multiline expressions', () => {
    expectTree(`
      5 + 4
      fn x -> x - 1
    `).toMatch(`
      BinOp
        Number 5
        +
        Number 4
      Function
        Params
          Identifier x
        BinOp
          Identifier x
          -
          Number 1
    `)
  })
})
