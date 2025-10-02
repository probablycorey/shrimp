import { type SyntaxNodeRef } from '@lezer/common'

export const nodeToString = (nodeRef: SyntaxNodeRef, input: string, maxDepth = 10) => {
  const lines: string[] = []

  function addNode(currentNodeRef: SyntaxNodeRef, depth = 0) {
    if (depth > maxDepth) {
      lines.push('  '.repeat(depth) + '...')
      return
    }

    const indent = '  '.repeat(depth)
    const text = input.slice(currentNodeRef.from, currentNodeRef.to)

    let child = currentNodeRef.node.firstChild
    if (child) {
      lines.push(`${indent}${currentNodeRef.name}`)
      while (child) {
        addNode(child, depth + 1)
        child = child.nextSibling
      }
    } else {
      const cleanText = currentNodeRef.name === 'String' ? text.slice(1, -1) : text
      lines.push(`${indent}${currentNodeRef.name} ${cleanText}`)
    }
  }

  addNode(nodeRef)

  return lines.join('\n')
}
