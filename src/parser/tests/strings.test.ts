import { expect, describe, test } from 'bun:test'

import '../shrimp.grammar' // Importing this so changes cause it to retest!

describe('string interpolation', () => {
  test('string with variable interpolation', () => {
    expect("'hello $name'").toMatchTree(`
      String
        StringFragment ${'hello '}
        Interpolation
          Identifier name
    `)
  })

  test('string with expression interpolation in the middle', () => {
    expect("'sum is $(a + b)!'").toMatchTree(`
      String
        StringFragment ${'sum is '}
        Interpolation
          ParenExpr
            BinOp
              Identifier a
              operator +
              Identifier b
        StringFragment !
    `)
  })

  test('string with expression interpolation at the end', () => {
    expect("'sum is $(a + b)'").toMatchTree(`
      String
        StringFragment ${'sum is '}
        Interpolation
          ParenExpr
            BinOp
              Identifier a
              operator +
              Identifier b
    `)
  })

  test('string with expression smooshed inbetween', () => {
    expect("'x/$y/z'").toMatchTree(`
      String
        StringFragment x/
        Interpolation
          Identifier y
        StringFragment /z
    `)
  })
})

describe('string escape sequences', () => {
  test('escaped dollar sign', () => {
    expect("'price is \\$10'").toMatchTree(`
      String
        StringFragment ${'price is '}
        StringEscape \\$
        StringFragment 10
    `)
  })

  test('escaped single quote', () => {
    expect("'it\\'s working'").toMatchTree(`
      String
        StringFragment ${'it'}
        StringEscape \\'
        StringFragment ${'s working'}
    `)
  })

  test('escaped backslash', () => {
    expect("'path\\\\file'").toMatchTree(`
      String
        StringFragment path
        StringEscape \\\\
        StringFragment file
    `)
  })

  test('escaped newline', () => {
    expect("'line1\\nline2'").toMatchTree(`
      String
        StringFragment line1
        StringEscape \\n
        StringFragment line2
    `)
  })

  test('escaped tab', () => {
    expect("'col1\\tcol2'").toMatchTree(`
      String
        StringFragment col1
        StringEscape \\t
        StringFragment col2
    `)
  })

  test('escaped carriage return', () => {
    expect("'text\\rmore'").toMatchTree(`
      String
        StringFragment text
        StringEscape \\r
        StringFragment more
    `)
  })

  test('multiple escape sequences', () => {
    expect("'\\$10\\nTotal: \\$20'").toMatchTree(`
      String
        StringEscape \\$
        StringFragment 10
        StringEscape \\n
        StringFragment ${'Total: '}
        StringEscape \\$
        StringFragment 20
    `)
  })
})
