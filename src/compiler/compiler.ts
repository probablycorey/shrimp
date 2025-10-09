import { CompilerError } from '#compiler/compilerError.ts'
import { parser } from '#parser/shrimp.ts'
import * as terms from '#parser/shrimp.terms'
import type { SyntaxNode, Tree } from '@lezer/common'
import { assert, errorMessage } from '#utils/utils'
import { toBytecode, type Bytecode } from 'reefvm'
import { compile } from 'tailwindcss'

export class Compiler {
  fnCounter = 0
  instructions: string[] = []
  labels = new Map<string, string[]>()
  bytecode: Bytecode

  constructor(public input: string) {
    try {
      const cst = parser.parse(input)
      const errors = checkTreeForErrors(cst, input)

      if (errors.length > 0) {
        throw new CompilerError(`Syntax errors found:\n${errors.join('\n')}`, 0, input.length)
      }

      this.#compileCst(cst, input)

      // Add the labels
      for (const [label, labelInstructions] of this.labels) {
        this.instructions.push(`${label}:`)
        this.instructions.push(...labelInstructions.map((instr) => `  ${instr}`))
        this.instructions.push('  RETURN')
      }

      // console.log(`🌭`, this.instructions.join('\n'))
      this.bytecode = toBytecode(this.instructions.join('\n'))
    } catch (error) {
      if (error instanceof CompilerError) {
        throw new Error(`Compiler Error:\n${error.toReadableString(input)}`)
      } else {
        throw new Error(`Unknown error during compilation:\n${errorMessage(error)}`)
      }
    }
  }

  #compileCst(cst: Tree, input: string) {
    const isProgram = cst.topNode.type.id === terms.Program
    assert(isProgram, `Expected Program node, got ${cst.topNode.type.name}`)

    let child = cst.topNode.firstChild
    while (child) {
      this.instructions.push(...this.#compileNode(child, input))
      child = child.nextSibling
    }

    this.instructions.push('HALT')
  }

  #compileNode(node: SyntaxNode, input: string): string[] {
    const value = input.slice(node.from, node.to)
    switch (node.type.id) {
      case terms.Number:
        return [`PUSH ${value}`]

      case terms.String:
        const strValue = value.slice(1, -1).replace(/\\/g, '')
        return [`PUSH "${strValue}"`]

      case terms.Boolean: {
        return [`PUSH ${value}`]
      }

      case terms.Identifier: {
        return [`TRY_LOAD ${value}`]
      }

      case terms.BinOp: {
        const { left, op, right } = getBinaryParts(node)
        const instructions: string[] = []
        instructions.push(...this.#compileNode(left, input))
        instructions.push(...this.#compileNode(right, input))

        const opValue = input.slice(op.from, op.to)
        switch (opValue) {
          case '+':
            instructions.push('ADD')
            break
          case '-':
            instructions.push('SUB')
            break
          case '*':
            instructions.push('MUL')
            break
          case '/':
            instructions.push('DIV')
            break
          default:
            throw new CompilerError(`Unsupported binary operator: ${opValue}`, op.from, op.to)
        }

        return instructions
      }

      case terms.Assign: {
        const { identifier, right } = getAssignmentParts(node)
        const instructions: string[] = []
        instructions.push(...this.#compileNode(right, input))
        const identifierName = input.slice(identifier.from, identifier.to)
        instructions.push(`STORE ${identifierName}`)

        return instructions
      }

      case terms.ParenExpr: {
        const child = node.firstChild
        if (!child) return [] // I guess it is empty parentheses?

        return this.#compileNode(child, input)
      }

      case terms.FunctionDef: {
        const { paramNames, bodyNode } = getFunctionDefParts(node, input)
        const instructions: string[] = []
        const functionName = `.func_${this.labels.size}`
        const bodyInstructions: string[] = []
        if (this.labels.has(functionName)) {
          throw new CompilerError(`Function name collision: ${functionName}`, node.from, node.to)
        }

        this.labels.set(functionName, bodyInstructions)

        instructions.push(`MAKE_FUNCTION (${paramNames}) ${functionName}`)
        bodyInstructions.push(...this.#compileNode(bodyNode, input))

        return instructions
      }

      case terms.FunctionCallOrIdentifier: {
        // For now, just treat them all like identifiers, but we might
        // need something like TRY_CALL in the future.
        return [`TRY_LOAD ${value}`]
      }

      /*
      ### Function Calls
      Stack order (bottom to top):

      LOAD fn
      PUSH arg1           ; Positional args
      PUSH arg2
      PUSH "name"         ; Named arg key
      PUSH "value"        ; Named arg value
      PUSH 2              ; Positional count
      PUSH 1              ; Named count
      CALL
      */
      case terms.FunctionCall: {
        const { identifierNode, namedArgs, positionalArgs } = getFunctionCallParts(node, input)
        const instructions: string[] = []
        instructions.push(...this.#compileNode(identifierNode, input))

        positionalArgs.forEach((arg) => {
          instructions.push(...this.#compileNode(arg, input))
        })

        namedArgs.forEach((arg) => {
          const { name, valueNode } = getNamedArgParts(arg, input)
          instructions.push(`PUSH "${name}"`)
          instructions.push(...this.#compileNode(valueNode, input))
        })

        instructions.push(`PUSH ${positionalArgs.length}`)
        instructions.push(`PUSH ${namedArgs.length}`)
        instructions.push(`CALL`)
        return instructions
      }

      default:
        throw new CompilerError(`Unsupported syntax node: ${node.type.name}`, node.from, node.to)
    }
  }
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
    throw new CompilerError(`BinOp expected 3 children, got ${children.length}`, node.from, node.to)
  }

  return { left, op, right }
}

const getAssignmentParts = (node: SyntaxNode) => {
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

const checkTreeForErrors = (tree: Tree, input: string): string[] => {
  const errors: string[] = []
  tree.iterate({
    enter: (node) => {
      if (node.type.isError) {
        const errorText = input.slice(node.from, node.to)
        errors.push(`Syntax error at ${node.from}-${node.to}: "${errorText}"`)
      }
    },
  })

  return errors
}

const getFunctionDefParts = (node: SyntaxNode, input: string) => {
  const children = getAllChildren(node)
  const [fnKeyword, paramsNode, colon, bodyNode] = children

  if (!fnKeyword || !paramsNode || !colon || !bodyNode) {
    throw new CompilerError(
      `FunctionDef expected 5 children, got ${children.length}`,
      node.from,
      node.to
    )
  }

  const paramNames = getAllChildren(paramsNode)
    .map((param) => {
      if (param.type.id !== terms.Identifier) {
        throw new CompilerError(
          `FunctionDef params must be Identifiers, got ${param.type.name}`,
          param.from,
          param.to
        )
      }
      return input.slice(param.from, param.to)
    })
    .join(' ')

  return { paramNames, bodyNode }
}

const getFunctionCallParts = (node: SyntaxNode, input: string) => {
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

const getNamedArgParts = (node: SyntaxNode, input: string) => {
  const children = getAllChildren(node)
  const [namedArgPrefix, valueNode] = getAllChildren(node)

  if (!namedArgPrefix || !valueNode) {
    const message = `NamedArg expected 2 children, got ${children.length}`
    throw new CompilerError(message, node.from, node.to)
  }

  const name = input.slice(namedArgPrefix.from, namedArgPrefix.to - 2) // Remove the trailing =
  return { name, valueNode }
}
