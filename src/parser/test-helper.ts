import { beforeAll, expect } from 'bun:test'
import { Tree, TreeCursor } from '@lezer/common'
import grammarFile from './shrimp.grammar'
import { parser } from './shrimp.ts'
import { $ } from 'bun'

// Regenerate the parser if the grammar file is newer than the generated parser
// This makes --watch work without needing to manually regenerate the parser
export const regenerateParser = async () => {
  const grammarStat = await Bun.file('src/parser/shrimp.grammar').stat()
  const jsStat = await Bun.file('src/parser/shrimp.ts').stat()

  if (grammarStat.mtime <= jsStat.mtime) return

  console.log(`Regenerating parser from ${grammarFile}...`)
  await $`bun generate-parser `
}

export const expectTree = (input: string) => {
  const tree = parser.parse(input)
  return {
    toMatch: (expected: string) => {
      expect(treeToString(tree, input)).toEqual(trimWhitespace(expected))
    },
  }
}

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
      const singleTokens = ['+', '-', '*', '/', '->']
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
