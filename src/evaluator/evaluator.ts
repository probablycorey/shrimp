import { Tree, type SyntaxNode } from '@lezer/common'
import * as terms from '../parser/shrimp.terms.ts'
import { RuntimeError } from '#evaluator/runtimeError.ts'
import { assert } from 'console'
import { assertNever } from '#utils/utils.tsx'
import { matchingCommands, type CommandShape } from '#editor/commands.ts'

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

type ResolvedArg = {
  value: any
  resolved: boolean
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

    case 'function': {
      const func = (...args: any[]) => {
        if (args.length !== evalNode.params.length) {
          throw new RuntimeError(
            `Function expected ${evalNode.params.length} arguments, got ${args.length}`,
            evalNode.node.from,
            evalNode.node.to
          )
        }

        // Create new context with parameter bindings
        const localContext = new Map(context)
        evalNode.params.forEach((param, index) => {
          localContext.set(param, args[index])
        })

        // Evaluate function body with new context
        return evaluateEvalNode(evalNode.body, input, localContext)
      }

      return func
    }

    case 'command': {
      const { match: command } = matchingCommands(evalNode.name)
      if (!command) {
        const { from, to } = evalNode.node
        throw new RuntimeError(`Unknown command "${evalNode.name}"`, from, to)
      }

      const resolvedArgs: ResolvedArg[] = command.args.map((argShape) => ({
        value: argShape.default,
        resolved: argShape.optional ? true : argShape.default !== undefined,
      }))

      // Filter the args into named and positional
      const namedArgNodes: NamedArgEvalNode[] = []
      const positionalArgNodes: PositionalArgEvalNode[] = []
      evalNode.args.forEach((arg) => {
        const isNamedArg = 'name' in arg && arg.name !== undefined
        isNamedArg ? namedArgNodes.push(arg) : positionalArgNodes.push(arg)
      })

      // First set the named args
      namedArgNodes.forEach((arg) => {
        const shapeIndex = command.args.findIndex((def) => def.name === arg.name)
        const shape = command.args[shapeIndex]

        if (!shape) {
          const { from, to } = arg.node
          throw new RuntimeError(`Unknown argument "${arg.name}"`, from, to)
        } else if (resolvedArgs[shapeIndex]?.resolved) {
          const { from, to } = arg.node
          throw new RuntimeError(`Argument "${arg.name}" already set`, from, to)
        }

        const value = evaluateEvalNode(arg.value, input, context)
        resolvedArgs[shapeIndex] = { value, resolved: true }
      })

      // Now set the positional args in order
      let unresolvedIndex = resolvedArgs.findIndex((arg) => !arg.resolved)
      positionalArgNodes.forEach((arg) => {
        const value = evaluateEvalNode(arg.value, input, context)
        if (unresolvedIndex === -1) {
          const { from, to } = arg.node
          throw new RuntimeError(`Too many positional arguments`, from, to)
        }

        resolvedArgs[unresolvedIndex] = { value, resolved: true }
        unresolvedIndex = resolvedArgs.findIndex((arg) => !arg.resolved)
      })

      let executor
      if (typeof command.execute === 'string') {
        throw new RuntimeError(
          `Path-based commands aren't supported yet...`,
          evalNode.node.from,
          evalNode.node.to
        )
        // Dynamic imports are not supported in Bun test environment
        // See:
        // const { default: importedExecutor } = await import(command.execute)
        // executor = importedExecutor
        // if (typeof executor !== 'function') {
        //   throw new RuntimeError(
        //     `Module "${command.execute}" for command ${command.command} does not export a default function`,
        //     evalNode.node.from,
        //     evalNode.node.to
        //   )
        // }
      } else {
        executor = command.execute
      }

      const argValues = resolvedArgs.map((arg) => arg.value)
      const result = executor(...argValues)
      return result
    }

    default:
      assertNever(evalNode)
  }
}

type Operators = '+' | '-' | '*' | '/'
type Context = Map<string, any>
type NamedArgEvalNode = { kind: 'arg'; value: EvalNode; name: string; node: SyntaxNode }
type PositionalArgEvalNode = { kind: 'arg'; value: EvalNode; node: SyntaxNode }
type ArgEvalNode = NamedArgEvalNode | PositionalArgEvalNode
type IdentifierEvalNode = { kind: 'identifier'; name: string; node: SyntaxNode }
type EvalNode =
  | { kind: 'number'; value: number; node: SyntaxNode }
  | { kind: 'string'; value: string; node: SyntaxNode }
  | { kind: 'boolean'; value: boolean; node: SyntaxNode }
  | { kind: 'binop'; op: Operators; left: EvalNode; right: EvalNode; node: SyntaxNode }
  | { kind: 'assignment'; name: string; value: EvalNode; node: SyntaxNode }
  | { kind: 'command'; name: string; args: ArgEvalNode[]; node: SyntaxNode }
  | { kind: 'function'; params: string[]; body: EvalNode; node: SyntaxNode }
  | IdentifierEvalNode

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

    case terms.Function: {
      const children = getAllChildren(node)
      if (children.length < 3) {
        throw new Error(
          `Parser bug: Function node has ${children.length} children, expected at least 3`
        )
      }

      // Structure: fn params : body
      const [_fn, paramsNode, _colon, ...bodyNodes] = children

      // Extract parameter names
      const paramNodes = getAllChildren(paramsNode)
      const params = paramNodes.map((paramNode) => {
        if (paramNode.type.id !== terms.Identifier) {
          throw new Error(`Parser bug: Function parameter is not an identifier`)
        }
        return input.slice(paramNode.from, paramNode.to)
      })

      // For now, assume body is a single expression (the rest of the children)
      const bodyNode = bodyNodes[0]
      if (!bodyNode) {
        throw new Error(`Parser bug: Function missing body`)
      }

      const body = syntaxNodeToEvalNode(bodyNode, input, context)
      return { kind: 'function', params, body, node }
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

  const commandNameNode = commandNode.firstChild ?? commandNode
  const commandName = input.slice(commandNameNode.from, commandNameNode.to)
  const argNodes = children.slice(1) // All the Arg/NamedArg nodes
  return { commandName, commandNode, argNodes }
}
