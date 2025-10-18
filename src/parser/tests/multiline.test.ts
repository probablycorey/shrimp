import { expect, describe, test } from 'bun:test'

import '../shrimp.grammar' // Importing this so changes cause it to retest!

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
        AssignableIdentifier add
        operator =
        FunctionDef
          keyword fn
          Params
            AssignableIdentifier a
            AssignableIdentifier b
          colon :
          Assign
            AssignableIdentifier result
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
          AssignableIdentifier x
          AssignableIdentifier y
        colon :
        FunctionCallOrIdentifier
          Identifier x
        end end
    `)
  })
})
