import { Tree, type SyntaxNode } from '@lezer/common'
import * as terms from '../parser/shrimp.terms.ts'
import { RuntimeError } from '#evaluator/runtimeError.ts'
import { assert } from 'console'
import { assertNever } from '#utils/utils.tsx'

export const evaluate = (input: string, tree: Tree, context: Context) => {
  let result = undefined
  let child = tree.topNode.firstChild
  try {
    while (child) {
      result = evaluateNode(child, input, context)
      child = child.nextSibling
    }
  } catch (error) {
    if (error instanceof RuntimeError) {
      throw new Error(error.toReadableString(input))
    } else {
      throw new Error('Unknown error during evaluation')
    }
  }

  return result
}

const evaluateNode = (node: SyntaxNode, input: string, context: Context): any => {
  try {
    const evalNode = syntaxNodeToEvalNode(node, input, context)
    return evaluateEvalNode(evalNode, input, context)
  } catch (error) {
    if (error instanceof RuntimeError) {
      throw error
    } else {
      console.error(error)
      throw new RuntimeError('Error evaluating node', node.from, node.to)
    }
  }
}

const evaluateEvalNode = (evalNode: EvalNode, input: string, context: Context): any => {
  switch (evalNode.kind) {
    case 'number':
    case 'string':
    case 'boolean':
      return evalNode.value

    case 'identifier': {
      const name = evalNode.name
      if (context.has(name)) {
        return context.get(name)
      } else {
        throw new RuntimeError(`Undefined variable "${name}"`, evalNode.node.from, evalNode.node.to)
      }
    }

    case 'assignment': {
      const name = evalNode.name
      const value = evaluateEvalNode(evalNode.value, input, context)
      context.set(name, value)
      return value
    }

    case 'binop': {
      const left = evaluateEvalNode(evalNode.left, input, context)
      const right = evaluateEvalNode(evalNode.right, input, context)

      if (evalNode.op === '+') {
        return left + right
      } else if (evalNode.op === '-') {
        return left - right
      } else if (evalNode.op === '*') {
        return left * right
      } else if (evalNode.op === '/') {
        return left / right
      } else {
        throw new RuntimeError(
          `Unsupported operator "${evalNode.op}"`,
          evalNode.node.from,
          evalNode.node.to
        )
      }
    }

    case 'arg': {
      // Just evaluate the arg's value
      return evaluateEvalNode(evalNode.value, input, context)
    }

    case 'command': {
      // TODO: Actually execute the command
      // For now, just return undefined
      return undefined
    }

    default:
      assertNever(evalNode)
  }
}

type Operators = '+' | '-' | '*' | '/'
type Context = Map<string, any>
type EvalNode =
  | { kind: 'number'; value: number; node: SyntaxNode }
  | { kind: 'string'; value: string; node: SyntaxNode }
  | { kind: 'boolean'; value: boolean; node: SyntaxNode }
  | { kind: 'identifier'; name: string; node: SyntaxNode }
  | { kind: 'binop'; op: Operators; left: EvalNode; right: EvalNode; node: SyntaxNode }
  | { kind: 'assignment'; name: string; value: EvalNode; node: SyntaxNode }
  | { kind: 'arg'; name?: string; value: EvalNode; node: SyntaxNode }
  | { kind: 'command'; name: string; args: EvalNode[]; node: SyntaxNode }

const syntaxNodeToEvalNode = (node: SyntaxNode, input: string, context: Context): EvalNode => {
  const value = input.slice(node.from, node.to)

  switch (node.type.id) {
    case terms.Number:
      return { kind: 'number', value: parseFloat(value), node }

    case terms.String:
      return { kind: 'string', value: value.slice(1, -1), node } // Remove quotes

    case terms.Boolean:
      return { kind: 'boolean', value: value === 'true', node }

    case terms.Identifier:
      return { kind: 'identifier', name: value, node }

    case terms.BinOp: {
      const { left, op, right } = getBinaryParts(node)
      const opString = input.slice(op.from, op.to) as Operators
      const leftNode = syntaxNodeToEvalNode(left, input, context)
      const rightNode = syntaxNodeToEvalNode(right, input, context)
      return { kind: 'binop', op: opString, left: leftNode, right: rightNode, node }
    }

    case terms.Assignment: {
      const { identifier, value: expr } = getAssignmentParts(node)
      const name = input.slice(identifier.from, identifier.to)
      const value = syntaxNodeToEvalNode(expr, input, context)
      return { kind: 'assignment', name, value, node }
    }

    case terms.ParenExpr: {
      const expr = getParenParts(node)
      return syntaxNodeToEvalNode(expr, input, context)
    }

    case terms.CommandCall: {
      const { commandName, argNodes } = extractCommand(node, input)

      const args = argNodes.map((argNode) => {
        const children = getAllChildren(argNode)

        if (argNode.type.id === terms.Arg) {
          const [child] = children
          if (!child) {
            throw new Error(`Parser bug: Arg node has ${children.length} children, expected 1`)
          }
          const value = syntaxNodeToEvalNode(child, input, context)
          return { kind: 'arg', value, node: argNode } as const
        }

        if (argNode.type.id === terms.NamedArg) {
          const [nameChild, valueChild] = children
          if (!nameChild || !valueChild) {
            throw new Error(`Parser bug: NamedArg node has ${children.length} children, expected 2`)
          }
          const namePrefix = input.slice(nameChild.from, nameChild.to)
          const name = namePrefix.slice(0, -1) // Remove '='
          const value = syntaxNodeToEvalNode(valueChild, input, context)
          return { kind: 'arg', name, value, node: argNode } as const
        }

        throw new Error(`Parser bug: Unexpected arg node type: ${argNode.type.name}`)
      })

      return { kind: 'command', name: commandName, args, node }
    }
  }

  throw new RuntimeError(`Unsupported node type "${node.type.name}"`, node.from, node.to)
}

// Helper functions for extracting node parts
const getAllChildren = (node: SyntaxNode): SyntaxNode[] => {
  const children: SyntaxNode[] = []
  let child = node.firstChild
  while (child) {
    children.push(child)
    child = child.nextSibling
  }
  return children
}

const getBinaryParts = (node: SyntaxNode) => {
  const children = getAllChildren(node)
  const [left, op, right] = children

  if (!left || !op || !right) {
    throw new RuntimeError(`BinOp expected 3 children, got ${children.length}`, node.from, node.to)
  }

  return { left, op, right }
}

const getAssignmentParts = (node: SyntaxNode) => {
  const children = getAllChildren(node)
  const [identifier, _equals, value] = children

  if (!identifier || !_equals || !value) {
    throw new RuntimeError(
      `Assignment expected 3 children, got ${children.length}`,
      node.from,
      node.to
    )
  }

  return { identifier, value }
}

const getParenParts = (node: SyntaxNode) => {
  const children = getAllChildren(node)
  const [_leftParen, expr, _rightParen] = children

  if (!_leftParen || !expr || !_rightParen) {
    throw new RuntimeError(
      `ParenExpr expected 3 children, got ${children.length}`,
      node.from,
      node.to
    )
  }

  return expr
}

const extractCommand = (node: SyntaxNode, input: string) => {
  const children = getAllChildren(node)
  const commandNode = children[0] // The Command node

  if (!commandNode || commandNode.type.id !== terms.Command) {
    throw new RuntimeError('Invalid command structure', node.from, node.to)
  }

  const commandName = input.slice(commandNode.firstChild!.from, commandNode.firstChild!.to)
  const argNodes = children.slice(1) // All the Arg/NamedArg nodes
  return { commandName, commandNode, argNodes }
}
