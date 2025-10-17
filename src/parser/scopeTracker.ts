import { ContextTracker } from '@lezer/lr'
import * as terms from './shrimp.terms'

export class Scope {
  constructor(public parent: Scope | null, public vars: Set<string>) {}

  has(name: string): boolean {
    return this.vars.has(name) ?? this.parent?.has(name)
  }

  add(...names: string[]): Scope {
    const newVars = new Set(this.vars)
    names.forEach((name) => newVars.add(name))
    return new Scope(this.parent, newVars)
  }

  push(): Scope {
    return new Scope(this, new Set())
  }

  pop(): Scope {
    return this.parent ?? new Scope(null, new Set())
  }

  hash(): number {
    let h = 0
    for (const name of this.vars) {
      for (let i = 0; i < name.length; i++) {
        h = (h << 5) - h + name.charCodeAt(i)
        h |= 0
      }
    }
    if (this.parent) {
      h = (h << 5) - h + this.parent.hash()
      h |= 0
    }
    return h
  }
}

// Module-level state for tracking identifiers
let pendingIdentifiers: string[] = []
let isInParams = false

// Term ID for 'fn' keyword - verified by parsing and inspecting the tree
const FN_KEYWORD = 33

export const trackScope = new ContextTracker<Scope>({
  start: new Scope(null, new Set()),

  shift(context, term, stack, input) {
    // Track fn keyword to enter param capture mode
    if (term === FN_KEYWORD) {
      isInParams = true
      pendingIdentifiers = []
      return context
    }

    // Capture identifiers
    if (term === terms.Identifier) {
      const text = input.read(input.pos, stack.pos)

      // Capture ALL identifiers when in params
      if (isInParams) {
        pendingIdentifiers.push(text)
      }
      // Capture FIRST identifier for assignments
      else if (pendingIdentifiers.length === 0) {
        pendingIdentifiers.push(text)
      }
    }

    return context
  },

  reduce(context, term, stack, input) {
    // Add assignment variable to scope
    if (term === terms.Assign && pendingIdentifiers.length > 0) {
      const newContext = context.add(pendingIdentifiers[0])
      pendingIdentifiers = []
      return newContext
    }

    // Push new scope and add parameters
    if (term === terms.Params) {
      const newScope = context.push()
      if (pendingIdentifiers.length > 0) {
        const newContext = newScope.add(...pendingIdentifiers)
        pendingIdentifiers = []
        isInParams = false
        return newContext
      }
      isInParams = false
      return newScope
    }

    // Pop scope when exiting function
    if (term === terms.FunctionDef) {
      return context.pop()
    }

    // Clear stale identifiers after non-assignment statements
    if (term === terms.DotGet || term === terms.FunctionCallOrIdentifier) {
      pendingIdentifiers = []
    }

    return context
  },

  hash: (context) => context.hash(),
})
