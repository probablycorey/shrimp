import { ContextTracker } from '@lezer/lr'
import * as terms from './shrimp.terms'

export class Scope {
  constructor(
    public parent: Scope | null,
    public vars: Set<string>,
    public pendingIdentifiers: string[] = [],
    public isInParams: boolean = false
  ) {}

  has(name: string): boolean {
    return this.vars.has(name) ?? this.parent?.has(name)
  }

  add(...names: string[]): Scope {
    const newVars = new Set(this.vars)
    names.forEach((name) => newVars.add(name))
    return new Scope(this.parent, newVars, [], this.isInParams)
  }

  push(): Scope {
    return new Scope(this, new Set(), [], false)
  }

  pop(): Scope {
    return this.parent ?? new Scope(null, new Set(), [], false)
  }

  withPendingIdentifiers(ids: string[]): Scope {
    return new Scope(this.parent, this.vars, ids, this.isInParams)
  }

  withIsInParams(value: boolean): Scope {
    return new Scope(this.parent, this.vars, this.pendingIdentifiers, value)
  }

  clearPending(): Scope {
    return new Scope(this.parent, this.vars, [], this.isInParams)
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
    // Include pendingIdentifiers and isInParams in hash
    h = (h << 5) - h + this.pendingIdentifiers.length
    h = (h << 5) - h + (this.isInParams ? 1 : 0)
    h |= 0
    return h
  }
}

export const trackScope = new ContextTracker<Scope>({
  start: new Scope(null, new Set(), [], false),

  shift(context, term, stack, input) {
    // Track fn keyword to enter param capture mode
    if (term === terms.Fn) {
      return context.withIsInParams(true).withPendingIdentifiers([])
    }

    // Capture identifiers
    if (term === terms.Identifier) {
      // Build text by peeking backwards from stack.pos to input.pos
      let text = ''
      const start = input.pos
      const end = stack.pos
      for (let i = start; i < end; i++) {
        const offset = i - input.pos
        const ch = input.peek(offset)
        if (ch === -1) break
        text += String.fromCharCode(ch)
      }

      // Capture ALL identifiers when in params
      if (context.isInParams) {
        return context.withPendingIdentifiers([...context.pendingIdentifiers, text])
      }
      // Capture FIRST identifier for assignments
      else if (context.pendingIdentifiers.length === 0) {
        return context.withPendingIdentifiers([text])
      }
    }

    return context
  },

  reduce(context, term, stack, input) {
    // Add assignment variable to scope
    if (term === terms.Assign && context.pendingIdentifiers.length > 0) {
      return context.add(context.pendingIdentifiers[0]!)
    }

    // Push new scope and add parameters
    if (term === terms.Params) {
      const newScope = context.push()
      if (context.pendingIdentifiers.length > 0) {
        return newScope.add(...context.pendingIdentifiers).withIsInParams(false)
      }
      return newScope.withIsInParams(false)
    }

    // Pop scope when exiting function
    if (term === terms.FunctionDef) {
      return context.pop()
    }

    // Clear stale identifiers after non-assignment statements
    if (term === terms.DotGet || term === terms.FunctionCallOrIdentifier || term === terms.FunctionCall) {
      return context.clearPending()
    }

    return context
  },

  hash: (context) => context.hash(),
})
