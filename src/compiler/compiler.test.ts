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
    expect(`fn a b: a + b end`).toEvaluateTo(Function)
  })

  test('function call', () => {
    expect(`add = fn a b: a + b end; add 2 9`).toEvaluateTo(11)
  })

  test('function call with named args', () => {
    expect(`minus = fn a b: a - b end; minus b=2 a=9`).toEvaluateTo(7)
  })

  test('function call with named and positional args', () => {
    expect(`minus = fn a b: a - b end; minus b=2 9`).toEvaluateTo(7)
    expect(`minus = fn c d: a - b end; minus 90 b=20`).toEvaluateTo(70)
    expect(`minus = fn e f: a - b end; minus a=900 200`).toEvaluateTo(700)
    expect(`minus = fn g h: a - b end; minus 2000 a=9000`).toEvaluateTo(7000)
  })

  test('function call with no args', () => {
    expect(`bloop = fn: 'bloop' end; bloop`).toEvaluateTo('bloop')
  })

  test('simple conditionals', () => {
    expect(`(3 < 6)`).toEvaluateTo(true)
    expect(`(10 > 20)`).toEvaluateTo(false)
    expect(`(4 <= 9)`).toEvaluateTo(true)
    expect(`(15 >= 20)`).toEvaluateTo(false)
    expect(`(7 = 7)`).toEvaluateTo(true)
    expect(`(5 != 5)`).toEvaluateTo(false)
    expect(`('shave' and 'haircut')`).toEvaluateTo('haircut')
    expect(`(false and witness)`).toEvaluateTo(false)
    expect(`('pride' or 'prejudice')`).toEvaluateTo('pride')
    expect(`(false or false)`).toEvaluateTo(false)
  })

  test('if', () => {
    expect(`if 3 < 9:
      shire
    end`).toEvaluateTo('shire')
  })

  test('if else', () => {
    expect(`if false:
      grey
    else:
      white
    end`).toEvaluateTo('white')
  })

  test('if elsif', () => {
    expect(`if false:
      boromir
    elsif true:
      frodo
    end`).toEvaluateTo('frodo')
  })

  test('if elsif else', () => {
    expect(`if false:
      destroyed
    elsif true:
      fire
    else:
      darkness
    end`).toEvaluateTo('fire')

    expect(`if false:
      king
    elsif false:
      elf
    elsif true:
      dwarf
    else:
      scattered
    end`).toEvaluateTo('dwarf')
  })
})

describe('errors', () => {
  test('syntax error', () => {
    expect('2 + ').toFailEvaluation()
  })
})

describe('multiline tests', () => {
  test('multiline function', () => {
    expect(`
      add = fn a b:
        result = a + b
        result
      end
      add 3 4
    `).toEvaluateTo(7)
  })
})
