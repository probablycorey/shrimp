import { Tree, type SyntaxNode } from '@lezer/common'
import * as terms from '../parser/shrimp.terms.ts'
import { RuntimeError } from '#evaluator/runtimeError.ts'

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
  const evalNode = syntaxNodeToEvalNode(node, input, context)

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
        throw new RuntimeError(`Undefined variable "${name}"`, node.from, node.to)
      }
    }

    case 'assignment': {
      const name = evalNode.name
      const value = evaluateNode(evalNode.value.node, input, context)
      context.set(name, value)

      return value
    }

    case 'binop': {
      const left = evaluateNode(evalNode.left, input, context)
      const right = evaluateNode(evalNode.right, input, context)

      if (evalNode.op === '+') {
        return left + right
      } else if (evalNode.op === '-') {
        return left - right
      } else if (evalNode.op === '*') {
        return left * right
      } else if (evalNode.op === '/') {
        return left / right
      } else {
        throw new RuntimeError(`Unsupported operator "${evalNode.op}"`, node.from, node.to)
      }
    }
  }
}

type Operators = '+' | '-' | '*' | '/'
type Context = Map<string, any>
type EvalNode =
  | { kind: 'number'; value: number; node: SyntaxNode }
  | { kind: 'string'; value: string; node: SyntaxNode }
  | { kind: 'boolean'; value: boolean; node: SyntaxNode }
  | { kind: 'identifier'; name: string; node: SyntaxNode }
  | { kind: 'binop'; op: Operators; left: SyntaxNode; right: SyntaxNode; node: SyntaxNode }
  | { kind: 'assignment'; name: string; value: EvalNode; node: SyntaxNode }
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
      const [left, op, right] = destructure(node, ['*', '*', '*'])
      const opString = input.slice(op.from, op.to) as Operators
      return { kind: 'binop', op: opString, left, right, node }
    }

    case terms.Assignment: {
      const [identifier, _equals, expr] = destructure(node, [terms.Identifier, '*', '*'])

      const name = input.slice(identifier.from, identifier.to)
      const value = syntaxNodeToEvalNode(expr, input, context)

      return { kind: 'assignment', name, value, node }
    }

    case terms.ParenExpr: {
      const [_leftParen, expr, _rightParen] = destructure(node, ['*', '*', '*'])
      return syntaxNodeToEvalNode(expr, input, context)
    }

    case terms.CommandCall: {
      const [_at, identifier, _leftParen, ...rest] = destructure(node, [
        '*',
        terms.Identifier,
        '*',
        '*',
      ])
  }

  throw new RuntimeError(`Unsupported node type "${node.type.name}"`, node.from, node.to)
}

/* 
The code below is a...
SIN AGAINST GOD!
...but it makes it easier to use above
*/
type ExpectedType = '*' | number
function destructure(node: SyntaxNode, expected: [ExpectedType]): [SyntaxNode]
function destructure(
  node: SyntaxNode,
  expected: [ExpectedType, ExpectedType]
): [SyntaxNode, SyntaxNode]
function destructure(
  node: SyntaxNode,
  expected: [ExpectedType, ExpectedType, ExpectedType]
): [SyntaxNode, SyntaxNode, SyntaxNode]
function destructure(node: SyntaxNode, expected: ExpectedType[]): SyntaxNode[] {
  const children: SyntaxNode[] = []
  let child = node.firstChild
  while (child) {
    children.push(child)
    child = child.nextSibling
  }

  if (children.length !== expected.length) {
    throw new RuntimeError(
      `${node.type.name} expected ${expected.length} children, got ${children.length}`,
      node.from,
      node.to
    )
  }

  children.forEach((child, i) => {
    const expectedType = expected[i]
    if (expectedType !== '*' && child.type.id !== expectedType) {
      throw new RuntimeError(
        `Child ${i} of ${node.type.name} expected ${expectedType}, got ${child.type.id} (${child.type.name})`,
        child.from,
        child.to
      )
    }
  })

  return children
}
