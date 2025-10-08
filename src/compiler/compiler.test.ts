import { describe } from 'bun:test'
import { expect, test } from 'bun:test'

describe('compiler', () => {
  test('number literal', () => {
    expect('42').toEvaluateTo(42)
  })

  test('negative number', () => {
    expect('-5').toEvaluateTo(-5)
  })

  test('string literal', () => {
    expect(`'hello'`).toEvaluateTo('hello')
  })

  test('boolean true', () => {
    expect('true').toEvaluateTo(true)
  })

  test('boolean false', () => {
    expect('false').toEvaluateTo(false)
  })

  test('addition', () => {
    expect('2 + 3').toEvaluateTo(5)
  })

  test('subtraction', () => {
    expect('10 - 4').toEvaluateTo(6)
  })

  test('multiplication', () => {
    expect('3 * 4').toEvaluateTo(12)
  })

  test('division', () => {
    expect('15 / 3').toEvaluateTo(5)
  })

  test('assign number', () => {
    expect('x = 5; x').toEvaluateTo(5)
  })

  test('emoji assignment to number', () => {
    expect('💎 = 5; 💎').toEvaluateTo(5)
  })

  test('unbound identifier', () => {
    expect('a = hello; a').toEvaluateTo('hello')
  })

  test('assign string', () => {
    expect(`name = 'Alice'; name`).toEvaluateTo('Alice')
  })

  test('assign expression', () => {
    expect('sum = 2 + 3; sum').toEvaluateTo(5)
  })

  test('parentheses', () => {
    expect('(2 + 3) * 4').toEvaluateTo(20)
  })

  test('function', () => {
    expect(`add = fn a b: a + b; add`).toEvaluateTo(Function)
  })

  test('function call', () => {
    expect(`add = fn a b: a + b; add 2 9`).toEvaluateTo(11)
  })
})

describe('errors', () => {
  test('syntax error', () => {
    expect('2 + ').toFailEvaluation()
  })
})

describe('multiline tests', () => {
  test.only('multiline function', () => {
    expect(`
      add = fn a b:
        result = a + b
        result
      add 3 4
    `).toEvaluateTo(7)
  })
})
