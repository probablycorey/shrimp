import { CompilerError } from '#compiler/compilerError.ts'
import { parser } from '#parser/shrimp.ts'
import * as terms from '#parser/shrimp.terms'
import type { SyntaxNode, Tree } from '@lezer/common'
import { assert, errorMessage } from '#utils/utils'
import { toBytecode, type Bytecode, type ProgramItem } from 'reefvm'
import {
  checkTreeForErrors,
  getAllChildren,
  getAssignmentParts,
  getBinaryParts,
  getFunctionCallParts,
  getFunctionDefParts,
  getIfExprParts,
  getNamedArgParts,
  getPipeExprParts,
  getStringParts,
} from '#compiler/utils'

const DEBUG = false
// const DEBUG = true

type Label = `.${string}`

// Process escape sequences in strings
function processEscapeSeq(escapeSeq: string): string {
  // escapeSeq includes the backslash, e.g., "\n", "\$", "\\"
  if (escapeSeq.length !== 2) return escapeSeq

  switch (escapeSeq[1]) {
    case 'n':
      return '\n'
    case 't':
      return '\t'
    case 'r':
      return '\r'
    case '\\':
      return '\\'
    case "'":
      return "'"
    case '$':
      return '$'
    default:
      return escapeSeq // Unknown escape, keep as-is
  }
}

export class Compiler {
  instructions: ProgramItem[] = []
  fnLabels = new Map<Label, ProgramItem[]>()
  ifLabelCount = 0
  bytecode: Bytecode
  pipeCounter = 0

  constructor(public input: string) {
    try {
      const cst = parser.parse(input)
      const errors = checkTreeForErrors(cst)

      const firstError = errors[0]
      if (firstError) {
        throw firstError
      }

      this.#compileCst(cst, input)

      // Add the labels
      for (const [label, labelInstructions] of this.fnLabels) {
        this.instructions.push([`${label}:`])
        this.instructions.push(...labelInstructions)
        this.instructions.push(['RETURN'])
      }

      if (DEBUG) logInstructions(this.instructions)

      this.bytecode = toBytecode(this.instructions)
    } catch (error) {
      if (error instanceof CompilerError) {
        throw new Error(error.toReadableString(input))
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

    this.instructions.push(['HALT'])
  }

  #compileNode(node: SyntaxNode, input: string): ProgramItem[] {
    const value = input.slice(node.from, node.to)

    if (DEBUG) console.log(`🫦  ${node.name}: ${value}`)

    switch (node.type.id) {
      case terms.Number:
        const number = Number(value)
        if (Number.isNaN(number))
          throw new CompilerError(`Invalid number literal: ${value}`, node.from, node.to)

        return [[`PUSH`, number]]

      case terms.String: {
        const { parts, hasInterpolation } = getStringParts(node, input)

        // Simple string without interpolation or escapes - extract text directly
        if (!hasInterpolation) {
          // Remove surrounding quotes and return as-is
          const strValue = value.slice(1, -1)
          return [['PUSH', strValue]]
        }

        // String with interpolation or escapes - compile each part and concatenate
        const instructions: ProgramItem[] = []
        parts.forEach((part) => {
          const partValue = input.slice(part.from, part.to)

          switch (part.type.id) {
            case terms.StringFragment:
              // Plain text fragment - just push as-is
              instructions.push(['PUSH', partValue])
              break

            case terms.EscapeSeq:
              // Process escape sequence and push the result
              const processed = processEscapeSeq(partValue)
              instructions.push(['PUSH', processed])
              break

            case terms.Interpolation:
              // Interpolation contains either Identifier or ParenExpr (the $ is anonymous)
              const child = part.firstChild
              if (!child) {
                throw new CompilerError('Interpolation has no child', part.from, part.to)
              }
              // Compile the Identifier or ParenExpr
              instructions.push(...this.#compileNode(child, input))
              break

            default:
              throw new CompilerError(
                `Unexpected string part: ${part.type.name}`,
                part.from,
                part.to
              )
          }
        })

        // Use STR_CONCAT to join all parts
        instructions.push(['STR_CONCAT', parts.length])
        return instructions
      }

      case terms.Boolean: {
        return [[`PUSH`, value === 'true']]
      }

      case terms.RegExp: {
        // remove the surrounding slashes and any flags
        const [_, pattern, flags] = value.match(/^\/\/(.*)\/\/([gimsuy]*)$/) || []
        if (!pattern) {
          throw new CompilerError(`Invalid regex literal: ${value}`, node.from, node.to)
        }
        let regex: RegExp

        try {
          regex = new RegExp(pattern, flags)
        } catch (e) {
          throw new CompilerError(`Invalid regex literal: ${value}`, node.from, node.to)
        }

        return [['PUSH', regex]]
      }

      case terms.Identifier: {
        return [[`TRY_LOAD`, value]]
      }

      case terms.BinOp: {
        const { left, op, right } = getBinaryParts(node)
        const instructions: ProgramItem[] = []
        instructions.push(...this.#compileNode(left, input))
        instructions.push(...this.#compileNode(right, input))

        const opValue = input.slice(op.from, op.to)
        switch (opValue) {
          case '+':
            instructions.push(['ADD'])
            break
          case '-':
            instructions.push(['SUB'])
            break
          case '*':
            instructions.push(['MUL'])
            break
          case '/':
            instructions.push(['DIV'])
            break
          default:
            throw new CompilerError(`Unsupported binary operator: ${opValue}`, op.from, op.to)
        }

        return instructions
      }

      case terms.Assign: {
        const { identifier, right } = getAssignmentParts(node)
        const instructions: ProgramItem[] = []
        instructions.push(...this.#compileNode(right, input))
        const identifierName = input.slice(identifier.from, identifier.to)
        instructions.push(['STORE', identifierName])

        return instructions
      }

      case terms.ParenExpr: {
        const child = node.firstChild
        if (!child) return [] // I guess it is empty parentheses?

        return this.#compileNode(child, input)
      }

      case terms.FunctionDef: {
        const { paramNames, bodyNodes } = getFunctionDefParts(node, input)
        const instructions: ProgramItem[] = []
        const functionLabel: Label = `.func_${this.fnLabels.size}`
        const bodyInstructions: ProgramItem[] = []
        if (this.fnLabels.has(functionLabel)) {
          throw new CompilerError(`Function name collision: ${functionLabel}`, node.from, node.to)
        }

        this.fnLabels.set(functionLabel, bodyInstructions)

        instructions.push(['MAKE_FUNCTION', paramNames, functionLabel])
        bodyNodes.forEach((bodyNode) => {
          bodyInstructions.push(...this.#compileNode(bodyNode, input))
        })

        return instructions
      }

      case terms.FunctionCallOrIdentifier: {
        return [['TRY_CALL', value]]
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
        const instructions: ProgramItem[] = []
        instructions.push(...this.#compileNode(identifierNode, input))

        positionalArgs.forEach((arg) => {
          instructions.push(...this.#compileNode(arg, input))
        })

        namedArgs.forEach((arg) => {
          const { name, valueNode } = getNamedArgParts(arg, input)
          instructions.push(['PUSH', name])
          instructions.push(...this.#compileNode(valueNode, input))
        })

        instructions.push(['PUSH', positionalArgs.length])
        instructions.push(['PUSH', namedArgs.length])
        instructions.push(['CALL'])
        return instructions
      }

      case terms.ThenBlock: {
        const instructions = getAllChildren(node)
          .map((child) => this.#compileNode(child, input))
          .flat()

        return instructions
      }

      case terms.IfExpr: {
        const { conditionNode, thenBlock, elseIfBlocks, elseThenBlock } = getIfExprParts(
          node,
          input
        )
        const instructions: ProgramItem[] = []
        instructions.push(...this.#compileNode(conditionNode, input))
        this.ifLabelCount++
        const endLabel: Label = `.end_${this.ifLabelCount}`

        const thenBlockInstructions = this.#compileNode(thenBlock, input)
        instructions.push(['JUMP_IF_FALSE', thenBlockInstructions.length + 1])
        instructions.push(...thenBlockInstructions)
        instructions.push(['JUMP', endLabel])

        // Else if
        elseIfBlocks.forEach(({ conditional, thenBlock }) => {
          instructions.push(...this.#compileNode(conditional, input))
          const elseIfInstructions = this.#compileNode(thenBlock, input)
          instructions.push(['JUMP_IF_FALSE', elseIfInstructions.length + 1])
          instructions.push(...elseIfInstructions)
          instructions.push(['JUMP', endLabel])
        })

        // Else
        if (elseThenBlock) {
          const elseThenInstructions = this.#compileNode(elseThenBlock, input)
          instructions.push(...elseThenInstructions)
        } else {
          instructions.push(['PUSH', null])
        }

        instructions.push([`${endLabel}:`])

        return instructions
      }

      // - `EQ`, `NEQ`, `LT`, `GT`, `LTE`, `GTE` - Pop 2, push boolean
      case terms.ConditionalOp: {
        const instructions: ProgramItem[] = []
        const { left, op, right } = getBinaryParts(node)
        const leftInstructions: ProgramItem[] = this.#compileNode(left, input)
        const rightInstructions: ProgramItem[] = this.#compileNode(right, input)

        const opValue = input.slice(op.from, op.to)
        switch (opValue) {
          case '=':
            instructions.push(...leftInstructions, ...rightInstructions, ['EQ'])
            break

          case '!=':
            instructions.push(...leftInstructions, ...rightInstructions, ['NEQ'])
            break

          case '<':
            instructions.push(...leftInstructions, ...rightInstructions, ['LT'])
            break

          case '>':
            instructions.push(...leftInstructions, ...rightInstructions, ['GT'])
            break

          case '<=':
            instructions.push(...leftInstructions, ...rightInstructions, ['LTE'])
            break

          case '>=':
            instructions.push(...leftInstructions, ...rightInstructions, ['GTE'])
            break

          case 'and':
            instructions.push(...leftInstructions)
            instructions.push(['DUP'])
            instructions.push(['JUMP_IF_FALSE', rightInstructions.length + 1])
            instructions.push(['POP'])
            instructions.push(...rightInstructions)
            break

          case 'or':
            instructions.push(...leftInstructions)
            instructions.push(['DUP'])
            instructions.push(['JUMP_IF_TRUE', rightInstructions.length + 1])
            instructions.push(['POP'])
            instructions.push(...rightInstructions)

            break

          default:
            throw new CompilerError(`Unsupported conditional operator: ${opValue}`, op.from, op.to)
        }

        return instructions
      }

      case terms.PipeExpr: {
        const { pipedFunctionCall, pipeReceivers } = getPipeExprParts(node)
        if (!pipedFunctionCall || pipeReceivers.length === 0) {
          throw new CompilerError('PipeExpr must have at least two operands', node.from, node.to)
        }

        const instructions: ProgramItem[] = []
        instructions.push(...this.#compileNode(pipedFunctionCall, input))

        this.pipeCounter++
        const pipeValName = `_pipe_value_${this.pipeCounter}`
        pipeReceivers.forEach((pipeReceiver) => {
          instructions.push(['STORE', pipeValName])

          const { identifierNode, namedArgs, positionalArgs } = getFunctionCallParts(
            pipeReceiver,
            input
          )

          instructions.push(...this.#compileNode(identifierNode, input))

          const isUnderscoreInPositionalArgs = positionalArgs.some(
            (arg) => arg.type.id === terms.Underscore
          )
          const isUnderscoreInNamedArgs = namedArgs.some((arg) => {
            const { valueNode } = getNamedArgParts(arg, input)
            return valueNode.type.id === terms.Underscore
          })

          const shouldPushPositionalArg = !isUnderscoreInPositionalArgs && !isUnderscoreInNamedArgs

          // If no underscore is explicitly used, add the piped value as the first positional arg
          if (shouldPushPositionalArg) {
            instructions.push(['LOAD', pipeValName])
          }

          positionalArgs.forEach((arg) => {
            if (arg.type.id === terms.Underscore) {
              instructions.push(['LOAD', pipeValName])
            } else {
              instructions.push(...this.#compileNode(arg, input))
            }
          })

          namedArgs.forEach((arg) => {
            const { name, valueNode } = getNamedArgParts(arg, input)
            instructions.push(['PUSH', name])
            if (valueNode.type.id === terms.Underscore) {
              instructions.push(['LOAD', pipeValName])
            } else {
              instructions.push(...this.#compileNode(valueNode, input))
            }
          })

          instructions.push(['PUSH', positionalArgs.length + (shouldPushPositionalArg ? 1 : 0)])
          instructions.push(['PUSH', namedArgs.length])
          instructions.push(['CALL'])
        })

        return instructions
      }

      default:
        throw new CompilerError(`Unsupported syntax node: ${node.type.name}`, node.from, node.to)
    }
  }
}

const logInstructions = (instructions: ProgramItem[]) => {
  const instructionsString = instructions
    .map((parts) => {
      const isPush = parts[0] === 'PUSH'
      return parts
        .map((part, i) => {
          const partAsString = typeof part == 'string' && isPush ? `'${part}'` : part!.toString()
          return i > 0 ? partAsString : part
        })
        .join(' ')
    })
    .join('\n')

  console.log(`\n🤖 instructions:\n----------------\n${instructionsString}\n\n`)
}
