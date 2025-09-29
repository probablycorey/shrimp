import { expect } from 'bun:test'
import { Tree, TreeCursor } from '@lezer/common'
import { parser } from './parser/shrimp.ts'
import { $ } from 'bun'

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
    toFailParse(): T
  }
}

expect.extend({
  toMatchTree(received: unknown, expected: string) {
    if (typeof received !== 'string') {
      return {
        message: () => 'toMatchTree can only be used with string values',
        pass: false,
      }
    }

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
    if (typeof received !== 'string') {
      return {
        message: () => 'toMatchTree can only be used with string values',
        pass: false,
      }
    }

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
      // Node names that should be displayed as single tokens (operators, keywords)
      const singleTokens = ['+', '-', '*', '/', '->', 'fn', '=', 'equals']
      if (singleTokens.includes(nodeName)) {
        lines.push(`${indent}${nodeName}`)
      } else {
        lines.push(`${indent}${nodeName} ${cleanText}`)
      }
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
