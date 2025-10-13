import { describe, test, expect } from 'bun:test'

describe('pipe expressions', () => {
  test('simple pipe passes result as first argument', () => {
    const code = `
      double = fn x: x * 2 end
      result = 5 | double
      result
    `

    expect(code).toEvaluateTo(10)
  })

  test('pipe chain with three stages', () => {
    const code = `
      addOne = fn x: x + 1 end
      double = fn x: x * 2 end
      square = fn x: x * x end
      result = 3 | addOne | double | square
      result
    `

    // 3 -> 4 -> 8 -> 64
    expect(code).toEvaluateTo(64)
  })

  test('pipe with function that has additional arguments', () => {
    const code = `
      multiply = fn a b: a * b end
      result = 5 | multiply 3
      result
    `

    // 5 becomes first arg, 3 is second arg: 5 * 3 = 15
    expect(code).toEvaluateTo(15)
  })

  test('pipe with bare identifier', () => {
    const code = `
      getValue = 42
      process = fn x: x + 10 end
      result = getValue | process
      result
    `

    expect(code).toEvaluateTo(52)
  })

  test('pipe in assignment', () => {
    const code = `
      addTen = fn x: x + 10 end
      result = 5 | addTen
      result
    `

    expect(code).toEvaluateTo(15)
  })
})
