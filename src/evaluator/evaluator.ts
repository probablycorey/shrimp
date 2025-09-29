import { nodeToString } from '@/evaluator/treeHelper'
import { Tree, type SyntaxNode } from '@lezer/common'
import * as terms from '../parser/shrimp.terms.ts'

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

export const evaluate = (input: string, tree: Tree, context: Context) => {
  // Just evaluate the top-level children, don't use iterate()
  let result = undefined
  let child = tree.topNode.firstChild
  while (child) {
    result = evaluateNode(child, input, context)
    child = child.nextSibling
  }

  return result
}

const evaluateNode = (node: SyntaxNode, input: string, context: Context): any => {
  const value = input.slice(node.from, node.to)

  try {
    switch (node.type.id) {
      case terms.Number: {
        return parseFloat(value)
      }

      case terms.Identifier: {
        if (!context.has(value)) {
          throw new Error(`Undefined identifier: ${value}`)
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
            throw new Error(`Unsupported operator: ${opValue}`)
        }
      }

      case terms.Assignment: {
        const [identifier, expr] = getChildren(node)

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
            throw new Error(`Expected ${paramNames.length} arguments, but got ${args.length}`)
          }

          const localContext = new Map(context)
          paramNames.forEach((param, index) => {
            localContext.set(param, args[index])
          })

          return evaluateNode(bodyNode, input, localContext)
        }
      }

      default:
        throw new Error(`Unsupported node type: ${node.name}`)
    }
  } catch (error) {
    throw new Error(`Error evaluating node "${value}"\n${error.message}`)
  }
}

const assertNode = (node: any, expectedName: string): SyntaxNode => {
  if (!node) {
    throw new Error(`Expected "${expectedName}", but got undefined`)
  }

  return node
}
