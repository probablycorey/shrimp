import { ContextTracker } from '@lezer/lr'
import * as terms from './shrimp.terms'

export class Scope {
  constructor(
    public parent: Scope | null,
    public vars: Set<string>
  ) {}

  has(name: string): boolean {
    return this.vars.has(name) || (this.parent?.has(name) ?? false)
  }

  add(...names: string[]): Scope {
    const newVars = new Set(this.vars)
    names.forEach(name => newVars.add(name))
    return new Scope(this.parent, newVars)
  }

  push(): Scope {
    return new Scope(this, new Set())
  }

  pop(): Scope {
    return this.parent ?? this
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

// Wrapper that adds temporary state for identifier capture
export class ScopeContext {
  constructor(
    public scope: Scope,
    public pendingIds: string[] = []
  ) {}
}

// Hash function only hashes the scope, not pending state
const hashScope = (context: ScopeContext): number => {
  return context.scope.hash()
}

export const trackScope = new ContextTracker<ScopeContext>({
  start: new ScopeContext(new Scope(null, new Set())),

  shift(context, term, stack, input) {
    // Only capture AssignableIdentifier tokens
    if (term === terms.AssignableIdentifier) {
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

      return new ScopeContext(
        context.scope,
        [...context.pendingIds, text]
      )
    }

    return context
  },

  reduce(context, term, stack, input) {
    // Add assignment variable to scope
    if (term === terms.Assign && context.pendingIds.length > 0) {
      // Pop the last identifier (most recent AssignableIdentifier)
      const varName = context.pendingIds[context.pendingIds.length - 1]!
      return new ScopeContext(
        context.scope.add(varName),
        context.pendingIds.slice(0, -1)
      )
    }

    // Push new scope and add all parameters
    if (term === terms.Params) {
      const newScope = context.scope.push()
      return new ScopeContext(
        context.pendingIds.length > 0
          ? newScope.add(...context.pendingIds)
          : newScope,
        []  // Clear all pending after consuming
      )
    }

    // Pop scope when exiting function
    if (term === terms.FunctionDef) {
      return new ScopeContext(context.scope.pop(), [])
    }

    return context
  },

  hash: hashScope,
})
