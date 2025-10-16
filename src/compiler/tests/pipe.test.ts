import { describe, test, expect } from 'bun:test'

describe('pipe expressions', () => {
  test('simple pipe passes result as first argument', () => {
    const code = `
      double = fn x: x * 2 end
      double 2 | double`

    expect(code).toEvaluateTo(8)
  })

  test('pipe chain with three stages', () => {
    const code = `
      add-one = fn x: x + 1 end
      double = fn x: x * 2 end
      minus-point-one = fn x: x - 0.1 end
      add-one 3 | double | minus-point-one`
    //       4        8       7.9
    expect(code).toEvaluateTo(7.9)
  })

  test('pipe with function that has additional arguments', () => {
    const code = `
      multiply = fn a b: a * b end
      get-five = fn: 5 end
      get-five | multiply 3`

    expect(code).toEvaluateTo(15)
  })

  test('pipe with bare identifier', () => {
    const code = `
      get-value = 42
      process = fn x: x + 10 end
      get-value | process`

    expect(code).toEvaluateTo(52)
  })

  test('pipe in assignment', () => {
    const code = `
      add-ten = fn x: x + 10 end
      result = add-ten 5 | add-ten
      result`

    // 5 + 10 = 15, then 15 + 10 = 25
    expect(code).toEvaluateTo(25)
  })

  test('pipe with named underscore arg', () => {
    expect(`
      divide = fn a b: a / b end
      get-ten = fn: 10 end
      get-ten | divide 2 b=_`).toEvaluateTo(0.2)

    expect(`
      divide = fn a b: a / b end
      get-ten = fn: 10 end
      get-ten | divide b=_ 2`).toEvaluateTo(0.2)

    expect(`
      divide = fn a b: a / b end
      get-ten = fn: 10 end
      get-ten | divide 2 a=_`).toEvaluateTo(5)

    expect(`
      divide = fn a b: a / b end
      get-ten = fn: 10 end
      get-ten | divide a=_ 2`).toEvaluateTo(5)
  })

  test('nested pipes', () => {
    // This is complicated, but the idea is to make sure the underscore
    // handling logic works correctly when there are multiple pipe stages
    // in a single expression.
    expect(`
      sub = fn a b: a - b end
      div = fn a b: a / b end
      sub 3 1 | div (sub 110 9 | sub 1) _ | div 5`).toEvaluateTo(10)
  })
})
