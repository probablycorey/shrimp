import { resetCommandSource, setCommandSource, type CommandShape } from '#editor/commands'
import { expect, test } from 'bun:test'

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
  expect('x = 5').toEvaluateTo(5)
})

test('emoji assignment to number', () => {
  expect('💎 = 5').toEvaluateTo(5)
})

test('assign string', () => {
  expect(`name = 'Alice'`).toEvaluateTo('Alice')
})

test('assign expression', () => {
  expect('sum = 2 + 3').toEvaluateTo(5)
})

test('parentheses', () => {
  expect('(2 + 3) * 4').toEvaluateTo(20)
})

test('simple command', () => {
  const commands: CommandShape[] = [
    {
      command: 'echo',
      args: [{ name: 'text', type: 'string' }],
      execute: (text: string) => text,
    },
  ]

  withCommands(commands, () => {
    expect(`echo hello`).toEvaluateTo('hello')
  })
})

const withCommands = (commands: CommandShape[], fn: () => void) => {
  try {
    setCommandSource(() => commands)
    fn()
  } catch (e) {
    throw e
  } finally {
    resetCommandSource()
  }
}
