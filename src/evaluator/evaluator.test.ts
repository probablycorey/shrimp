import { expect, test } from 'bun:test'

test('parses simple assignments', () => {
  expect('number = 5').toEvaluateTo(5)
  expect('number = -5.3').toEvaluateTo(-5.3)
  expect(`string = 'abc'`).toEvaluateTo('abc')
  expect('boolean = true').toEvaluateTo(true)
})
