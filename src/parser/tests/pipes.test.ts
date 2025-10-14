import { expect, describe, test } from 'bun:test'

import '../shrimp.grammar' // Importing this so changes cause it to retest!

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
