import { expect, describe, test } from 'bun:test'

import '../shrimp.grammar' // Importing this so changes cause it to retest!

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
