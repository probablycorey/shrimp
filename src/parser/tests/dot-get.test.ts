import { describe, test, expect } from 'bun:test'
import '../../testSetup'

describe('DotGet', () => {
  test('readme.txt is Word when readme not in scope', () => {
    expect('readme.txt').toMatchTree(`Word readme.txt`)
  })

  test('obj.prop is DotGet when obj is assigned', () => {
    expect('obj = 5; obj.prop').toMatchTree(`
      Assign
        Identifier obj
        operator =
        Number 5
      DotGet
        Identifier obj
        Identifier prop
    `)
  })

  test('function parameters are in scope within function body', () => {
    expect('fn config: config.path end').toMatchTree(`
      FunctionDef
        keyword fn
        Params
          Identifier config
        colon :
        DotGet
          Identifier config
          Identifier path
        end end
    `)
  })

  test('parameters out of scope outside function', () => {
    expect('fn x: x.prop end; x.prop').toMatchTree(`
      FunctionDef
        keyword fn
        Params
          Identifier x
        colon :
        DotGet
          Identifier x
          Identifier prop
        end end
      Word x.prop
    `)
  })

  test('multiple parameters work correctly', () => {
    expect(`fn x y:
  x.foo
  y.bar
end`).toMatchTree(`
      FunctionDef
        keyword fn
        Params
          Identifier x
          Identifier y
        colon :
        DotGet
          Identifier x
          Identifier foo
        DotGet
          Identifier y
          Identifier bar
        end end
    `)
  })

  test('nested functions with scope isolation', () => {
    expect(`fn x:
  x.outer
  fn y: y.inner end
end`).toMatchTree(`
      FunctionDef
        keyword fn
        Params
          Identifier x
        colon :
        DotGet
          Identifier x
          Identifier outer
        FunctionDef
          keyword fn
          Params
            Identifier y
          colon :
          DotGet
            Identifier y
            Identifier inner
          end end
        end end
    `)
  })

  test('dot get works as function argument', () => {
    expect('config = 42; echo config.path').toMatchTree(`
      Assign
        Identifier config
        operator =
        Number 42
      FunctionCall
        Identifier echo
        PositionalArg
          DotGet
            Identifier config
            Identifier path
    `)
  })

  test('mixed file paths and dot get', () => {
    expect('config = 42; cat readme.txt; echo config.path').toMatchTree(`
      Assign
        Identifier config
        operator =
        Number 42
      FunctionCall
        Identifier cat
        PositionalArg
          Word readme.txt
      FunctionCall
        Identifier echo
        PositionalArg
          DotGet
            Identifier config
            Identifier path
    `)
  })
})
