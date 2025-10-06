import { expect } from 'bun:test'
import { Tree, TreeCursor } from '@lezer/common'
import { parser } from '#parser/shrimp'
import { $ } from 'bun'
import { assert } from '#utils/utils'
import { evaluate } from '#interpreter/evaluator'

const regenerateParser = async () => {
  let generate = true
  try {
    const grammarStat = await Bun.file('./src/parser/shrimp.grammar').stat()
    const tokenizerStat = await Bun.file('./src/parser/tokenizers.ts').stat()
    const parserStat = await Bun.file('./src/parser/shrimp.ts').stat()

    if (grammarStat.mtime <= parserStat.mtime && tokenizerStat.mtime <= parserStat.mtime) {
      generate = false
    }
  } catch (e) {
    console.error('Error checking or regenerating parser:', e)
  } finally {
    if (generate) {
      await $`bun generate-parser`
    }
  }
}

await regenerateParser()

// Type declaration for TypeScript
declare module 'bun:test' {
  interface Matchers<T> {
    toMatchTree(expected: string): T
    toMatchExpression(expected: string): T
    toFailParse(): T
    toEvaluateTo(expected: unknown): T
  }
}

expect.extend({
  toMatchTree(received: unknown, expected: string) {
    assert(typeof received === 'string', 'toMatchTree can only be used with string values')

    const tree = parser.parse(received)
    const actual = treeToString(tree, received)
    const normalizedExpected = trimWhitespace(expected)

    try {
      // A hacky way to show the colorized diff in the test output
      expect(actual).toEqual(normalizedExpected)
      return { pass: true, message: () => '' }
    } catch (error) {
      return {
        message: () => (error as Error).message,
        pass: false,
      }
    }
  },

  toFailParse(received: unknown) {
    assert(typeof received === 'string', 'toFailParse can only be used with string values')

    try {
      const tree = parser.parse(received)
      let hasErrors = false
      tree.iterate({
        enter(n) {
          if (n.type.isError) {
            hasErrors = true
            return false
          }
        },
      })

      if (hasErrors) {
        return {
          message: () => `Expected input to fail parsing, and it did.`,
          pass: true,
        }
      } else {
        const actual = treeToString(tree, received)
        return {
          message: () => `Expected input to fail parsing, but it parsed successfully:\n${actual}`,
          pass: false,
        }
      }
    } catch (error) {
      return {
        message: () => `Parsing threw an error: ${(error as Error).message}`,
        pass: false,
      }
    }
  },

  toEvaluateTo(received: unknown, expected: unknown) {
    assert(typeof received === 'string', 'toEvaluateTo can only be used with string values')

    try {
      const tree = parser.parse(received)
      let hasErrors = false
      tree.iterate({
        enter(n) {
          if (n.type.isError) {
            hasErrors = true
            return false
          }
        },
      })

      if (hasErrors) {
        const actual = treeToString(tree, received)
        return {
          message: () =>
            `Expected input to evaluate successfully, but it had syntax errors:\n${actual}`,
          pass: false,
        }
      } else {
        const context = new Map<string, unknown>()
        const result = evaluate(received, tree, context)
        if (Object.is(result, expected)) {
          return { pass: true }
        } else {
          const expectedStr = JSON.stringify(expected)
          const resultStr = JSON.stringify(result)
          return {
            message: () => `Expected evaluation to be ${expectedStr}, but got ${resultStr}`,
            pass: false,
          }
        }
      }
    } catch (error) {
      return {
        message: () => `Evaluation threw an error:\n${(error as Error).message}`,
        pass: false,
      }
    }
  },
})

const treeToString = (tree: Tree, input: string): string => {
  const lines: string[] = []

  const addNode = (cursor: TreeCursor, depth: number) => {
    if (!cursor.name) return

    const indent = '  '.repeat(depth)
    const text = input.slice(cursor.from, cursor.to)
    const nodeName = cursor.name // Save the node name before moving cursor

    if (cursor.firstChild()) {
      lines.push(`${indent}${nodeName}`)
      do {
        addNode(cursor, depth + 1)
      } while (cursor.nextSibling())
      cursor.parent()
    } else {
      const cleanText = nodeName === 'String' ? text.slice(1, -1) : text
      lines.push(`${indent}${nodeName} ${cleanText}`)
    }
  }

  const cursor = tree.cursor()
  if (cursor.firstChild()) {
    do {
      addNode(cursor, 0)
    } while (cursor.nextSibling())
  }

  return lines.join('\n')
}

const trimWhitespace = (str: string): string => {
  const lines = str.split('\n').filter((line) => line.trim().length > 0)
  const firstLine = lines[0]
  if (!firstLine) return ''

  const leadingWhitespace = firstLine.match(/^(\s*)/)?.[1] || ''
  return lines
    .map((line) => {
      if (!line.startsWith(leadingWhitespace)) {
        let foundWhitespace = line.match(/^(\s*)/)?.[1] || ''
        throw new Error(
          `Line has inconsistent leading whitespace: "${line}" (found "${foundWhitespace}", expected "${leadingWhitespace}")`
        )
      }
      return line.slice(leadingWhitespace.length)
    })
    .join('\n')
}

const expectString = (value: unknown): string => {
  if (typeof value !== 'string') {
    throw new Error('Expected a string input')
  }
  return value
}
