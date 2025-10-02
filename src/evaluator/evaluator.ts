import { nodeToString } from '#/evaluator/treeHelper'
import { Tree, type SyntaxNode } from '@lezer/common'
import * as terms from '../parser/shrimp.terms.ts'
import { errorMessage } from '#utils/utils.ts'

type Context = Map<string, any>

function getChildren(node: SyntaxNode): SyntaxNode[] {
  const children = []
  let child = node.firstChild
  while (child) {
    children.push(child)
    child = child.nextSibling
  }
  return children
}

class RuntimeError extends Error {
  constructor(message: string, private input: string, private from: number, private to: number) {
    super(message)
    this.name = 'RuntimeError'
    this.message = `${message} at "${input.slice(from, to)}" (${from}:${to})`
  }

  toReadableString(code: string) {
    const pointer = ' '.repeat(this.from) + '^'.repeat(this.to - this.from)
    const context = code.split('\n').slice(-2).join('\n')
    return `${context}\n${pointer}\n${this.message}`
  }
}

export const evaluate = (input: string, tree: Tree, context: Context) => {
  // Just evaluate the top-level children, don't use iterate()
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
      throw new RuntimeError('Unknown error during evaluation', input, 0, input.length)
    }
  }

  return result
}

const evaluateNode = (node: SyntaxNode, input: string, context: Context): any => {
  const value = input.slice(node.from, node.to)

  switch (node.type.id) {
    case terms.Number: {
      return parseFloat(value)
    }

    case terms.String: {
      return value.slice(1, -1) // Remove quotes
    }
    case terms.Boolean: {
      return value === 'true'
    }

    case terms.Identifier: {
      if (!context.has(value)) {
        throw new RuntimeError(`Undefined identifier: ${value}`, input, node.from, node.to)
      }
      return context.get(value)
    }

    case terms.BinOp: {
      let [left, op, right] = getChildren(node)

      left = assertNode(left, 'LeftOperand')
      op = assertNode(op, 'Operator')
      right = assertNode(right, 'RightOperand')

      const leftValue = evaluateNode(left, input, context)
      const opValue = input.slice(op.from, op.to)
      const rightValue = evaluateNode(right, input, context)

      switch (opValue) {
        case '+':
          return leftValue + rightValue
        case '-':
          return leftValue - rightValue
        case '*':
          return leftValue * rightValue
        case '/':
          return leftValue / rightValue
        default:
          throw new RuntimeError(`Unknown operator: ${opValue}`, input, op.from, op.to)
      }
    }

    case terms.Assignment: {
      const [identifier, _operator, expr] = getChildren(node)

      const identifierNode = assertNode(identifier, 'Identifier')
      const exprNode = assertNode(expr, 'Expression')

      const name = input.slice(identifierNode.from, identifierNode.to)
      const value = evaluateNode(exprNode, input, context)
      context.set(name, value)

      return value
    }

    case terms.Function: {
      const [params, body] = getChildren(node)

      const paramNodes = getChildren(assertNode(params, 'Parameters'))
      const bodyNode = assertNode(body, 'Body')

      const paramNames = paramNodes.map((param) => {
        const paramNode = assertNode(param, 'Identifier')
        return input.slice(paramNode.from, paramNode.to)
      })

      return (...args: any[]) => {
        if (args.length !== paramNames.length) {
          throw new RuntimeError(
            `Expected ${paramNames.length} arguments, but got ${args.length}`,
            input,
            node.from,
            node.to
          )
        }

        const localContext = new Map(context)
        paramNames.forEach((param, index) => {
          localContext.set(param, args[index])
        })

        return evaluateNode(bodyNode, input, localContext)
      }
    }

    case terms.CommandCall: {
      const commandNode = assertNode(node.firstChild, 'Command')
      const commandIdentifier = assertNode(commandNode.firstChild, 'Identifier')
      const command = input.slice(commandIdentifier.from, commandIdentifier.to)

      const args = getChildren(node)
        .slice(1)
        .map((argNode) => {
          if (argNode.type.id === terms.Arg) {
            return evaluateNode(argNode, input, context)
          } else if (argNode.type.id === terms.NamedArg) {
            return evaluateNode(argNode, input, context)
          } else {
            throw new RuntimeError(
              `Unexpected argument type: ${argNode.type.name}`,
              input,
              argNode.from,
              argNode.to
            )
          }
        })
      const commandName = input.slice(commandIdentifier.from, commandIdentifier.to)
    }

    default:
      const isLowerCase = node.type.name[0] == node.type.name[0]?.toLowerCase()

      // Ignore nodes with lowercase names, those are for syntax only
      if (!isLowerCase) {
        throw new RuntimeError(
          `Unsupported node type "${node.type.name}"`,
          input,
          node.from,
          node.to
        )
      }
  }
}

const assertNode = (node: any, expectedName: string): SyntaxNode => {
  if (!node) {
    throw new Error(`Expected "${expectedName}", but got undefined`)
  }

  return node
}
