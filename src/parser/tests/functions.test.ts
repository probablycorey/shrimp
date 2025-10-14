import { expect, describe, test } from 'bun:test'
import { afterEach } from 'bun:test'
import { resetCommandSource, setCommandSource } from '#editor/commands'
import { beforeEach } from 'bun:test'

import '../shrimp.grammar' // Importing this so changes cause it to retest!

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
