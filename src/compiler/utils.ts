import { CompilerError } from '#compiler/compilerError.ts'
import * as terms from '#parser/shrimp.terms'
import type { SyntaxNode, Tree } from '@lezer/common'

export const checkTreeForErrors = (tree: Tree): CompilerError[] => {
  const errors: CompilerError[] = []
  tree.iterate({
    enter: (node) => {
      if (node.type.isError) {
        errors.push(new CompilerError(`Unexpected syntax.`, node.from, node.to))
      }
    },
  })

  return errors
}

export const getAllChildren = (node: SyntaxNode): SyntaxNode[] => {
  const children: SyntaxNode[] = []
  let child = node.firstChild
  while (child) {
    children.push(child)
    child = child.nextSibling
  }
  return children
}

export const getBinaryParts = (node: SyntaxNode) => {
  const children = getAllChildren(node)
  const [left, op, right] = children

  if (!left || !op || !right) {
    throw new CompilerError(`BinOp expected 3 children, got ${children.length}`, node.from, node.to)
  }

  return { left, op, right }
}

export const getAssignmentParts = (node: SyntaxNode) => {
  const children = getAllChildren(node)
  const [left, equals, right] = children

  if (!left || left.type.id !== terms.Identifier) {
    throw new CompilerError(
      `Assign left child must be an Identifier, got ${left ? left.type.name : 'none'}`,
      node.from,
      node.to
    )
  } else if (!equals || !right) {
    throw new CompilerError(
      `Assign expected 3 children, got ${children.length}`,
      node.from,
      node.to
    )
  }

  return { identifier: left, right }
}

export const getFunctionDefParts = (node: SyntaxNode, input: string) => {
  const children = getAllChildren(node)
  const [fnKeyword, paramsNode, colon, ...bodyNodes] = children

  if (!fnKeyword || !paramsNode || !colon || !bodyNodes) {
    throw new CompilerError(
      `FunctionDef expected 5 children, got ${children.length}`,
      node.from,
      node.to
    )
  }

  const paramNames = getAllChildren(paramsNode).map((param) => {
    if (param.type.id !== terms.Identifier) {
      throw new CompilerError(
        `FunctionDef params must be Identifiers, got ${param.type.name}`,
        param.from,
        param.to
      )
    }
    return input.slice(param.from, param.to)
  })

  const bodyWithoutEnd = bodyNodes.slice(0, -1)
  return { paramNames, bodyNodes: bodyWithoutEnd }
}

export const getFunctionCallParts = (node: SyntaxNode, input: string) => {
  const [identifierNode, ...args] = getAllChildren(node)

  if (!identifierNode) {
    throw new CompilerError(`FunctionCall expected at least 1 child, got 0`, node.from, node.to)
  }

  const namedArgs = args.filter((arg) => arg.type.id === terms.NamedArg)
  const positionalArgs = args
    .filter((arg) => arg.type.id === terms.PositionalArg)
    .map((arg) => {
      const child = arg.firstChild
      if (!child) throw new CompilerError(`PositionalArg has no child`, arg.from, arg.to)

      return child
    })

  return { identifierNode, namedArgs, positionalArgs }
}

export const getNamedArgParts = (node: SyntaxNode, input: string) => {
  const children = getAllChildren(node)
  const [namedArgPrefix, valueNode] = getAllChildren(node)

  if (!namedArgPrefix || !valueNode) {
    const message = `NamedArg expected 2 children, got ${children.length}`
    throw new CompilerError(message, node.from, node.to)
  }

  const name = input.slice(namedArgPrefix.from, namedArgPrefix.to - 1) // Remove the trailing =
  return { name, valueNode }
}

export const getIfExprParts = (node: SyntaxNode, input: string) => {
  const children = getAllChildren(node)

  const [ifKeyword, conditionNode, _colon, thenBlock, ...rest] = children
  if (!ifKeyword || !conditionNode || !thenBlock) {
    throw new CompilerError(
      `IfExpr expected at least 4 children, got ${children.length}`,
      node.from,
      node.to
    )
  }

  let elseIfBlocks: { conditional: SyntaxNode; thenBlock: SyntaxNode }[] = []
  let elseThenBlock: SyntaxNode | undefined
  rest.forEach((child) => {
    const parts = getAllChildren(child)

    if (child.type.id === terms.ElseExpr) {
      if (parts.length !== 3) {
        const message = `ElseExpr expected 1 child, got ${parts.length}`
        throw new CompilerError(message, child.from, child.to)
      }
      elseThenBlock = parts.at(-1)
    } else if (child.type.id === terms.ElsifExpr) {
      const [_keyword, conditional, _colon, thenBlock] = parts
      if (!conditional || !thenBlock) {
        const names = parts.map((p) => p.type.name).join(', ')
        const message = `ElsifExpr expected conditional and thenBlock, got ${names}`
        throw new CompilerError(message, child.from, child.to)
      }

      elseIfBlocks.push({ conditional, thenBlock })
    }
  })

  return { conditionNode, thenBlock, elseThenBlock, elseIfBlocks }
}

export const getPipeExprParts = (node: SyntaxNode) => {
  const [pipedFunctionCall, operator, ...rest] = getAllChildren(node)
  if (!pipedFunctionCall || !operator || rest.length === 0) {
    const message = `PipeExpr expected at least 3 children, got ${getAllChildren(node).length}`
    throw new CompilerError(message, node.from, node.to)
  }

  const pipeReceivers = rest.filter((child) => child.name !== 'operator')

  return { pipedFunctionCall, pipeReceivers }
}
