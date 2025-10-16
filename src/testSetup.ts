import { expect } from 'bun:test'
import { Tree, TreeCursor } from '@lezer/common'
import { parser } from '#parser/shrimp'
import { $ } from 'bun'
import { assert, assertNever, errorMessage } from '#utils/utils'
import { Compiler } from '#compiler/compiler'
import { VM, type Value } from 'reefvm'

const regenerateParser = async () => {
  let generate = true
  try {
    const grammarStat = await Bun.file('./src/parser/shrimp.grammar').stat()
    const tokenizerStat = await Bun.file('./src/parser/tokenizer.ts').stat()
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
    toEvaluateTo(expected: unknown): Promise<T>
    toFailEvaluation(): Promise<T>
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

  async toEvaluateTo(received: unknown, expected: unknown) {
    assert(typeof received === 'string', 'toEvaluateTo can only be used with string values')

    try {
      const compiler = new Compiler(received)
      const vm = new VM(compiler.bytecode)
      await vm.run()
      const result = await vm.run()
      let value = VMResultToValue(result)

      // Just treat regex as strings for comparison purposes
      if (expected instanceof RegExp) expected = String(expected)
      if (value instanceof RegExp) value = String(value)

      if (value === expected) {
        return { pass: true }
      } else {
        return {
          message: () => `Expected evaluation to be ${expected}, but got ${value}`,
          pass: false,
        }
      }
    } catch (error) {
      return {
        message: () => `Evaluation threw an error:\n${(error as Error).message}`,
        pass: false,
      }
    }
  },

  async toFailEvaluation(received: unknown) {
    assert(typeof received === 'string', 'toFailEvaluation can only be used with string values')

    try {
      const compiler = new Compiler(received)
      const vm = new VM(compiler.bytecode)
      await vm.run()

      return {
        message: () => `Expected evaluation to fail, but it succeeded.`,
        pass: false,
      }
    } catch (error) {
      return {
        message: () => `Evaluation failed as expected: ${errorMessage(error)}`,
        pass: true,
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

const VMResultToValue = (result: Value): unknown => {
  if (
    result.type === 'number' ||
    result.type === 'boolean' ||
    result.type === 'string' ||
    result.type === 'regex'
  ) {
    return result.value
  } else if (result.type === 'null') {
    return null
  } else if (result.type === 'array') {
    return result.value.map(VMResultToValue)
  } else if (result.type === 'dict') {
    const obj: Record<string, unknown> = {}
    for (const [key, val] of Object.entries(result.value)) {
      obj[key] = VMResultToValue(val)
    }

    return obj
  } else if (result.type === 'function') {
    return Function
  } else {
    assertNever(result)
  }
}
