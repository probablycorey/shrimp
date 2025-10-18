import { ContextTracker, InputStream } from '@lezer/lr'
import * as terms from './shrimp.terms'

export class Scope {
  constructor(public parent: Scope | null, public vars = new Set<string>()) {}

  has(name: string): boolean {
    return this.vars.has(name) ?? this.parent?.has(name)
  }

  add(...names: string[]): Scope {
    const newVars = new Set(this.vars)
    names.forEach((name) => newVars.add(name))
    return new Scope(this.parent, newVars)
  }

  push(): Scope {
    return new Scope(this)
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
  constructor(public scope: Scope, public pendingIds: string[] = []) {}

  // Helper to append identifier to pending list
  withPending(id: string): ScopeContext {
    return new ScopeContext(this.scope, [...this.pendingIds, id])
  }

  // Helper to consume last pending identifier and add to scope
  consumeLast(): ScopeContext {
    const varName = this.pendingIds.at(-1)
    if (!varName) return this
    return new ScopeContext(this.scope.add(varName), this.pendingIds.slice(0, -1))
  }

  // Helper to consume all pending identifiers and add to new scope
  consumeAll(): ScopeContext {
    let newScope = this.scope.push()
    newScope = this.pendingIds.length > 0 ? newScope.add(...this.pendingIds) : newScope
    return new ScopeContext(newScope)
  }

  // Helper to clear pending without adding to scope
  clearPending(): ScopeContext {
    return new ScopeContext(this.scope)
  }
}

// Extract identifier text from input stream
const readIdentifierText = (input: InputStream, start: number, end: number): string => {
  let text = ''
  for (let i = start; i < end; i++) {
    const offset = i - input.pos
    const ch = input.peek(offset)
    if (ch === -1) break
    text += String.fromCharCode(ch)
  }
  return text
}

export const trackScope = new ContextTracker<ScopeContext>({
  start: new ScopeContext(new Scope(null, new Set())),

  shift(context, term, stack, input) {
    if (term !== terms.AssignableIdentifier) return context

    const text = readIdentifierText(input, input.pos, stack.pos)
    return context.withPending(text)
  },

  reduce(context, term) {
    if (term === terms.Assign) return context.consumeLast()
    if (term === terms.Params) return context.consumeAll()

    // Pop scope when exiting function
    if (term === terms.FunctionDef) {
      return new ScopeContext(context.scope.pop())
    }

    return context
  },

  hash: (context) => context.scope.hash(),
})
