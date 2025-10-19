import { ContextTracker, InputStream } from '@lezer/lr'
import * as terms from './shrimp.terms'

export class Scope {
  constructor(public parent: Scope | null, public vars = new Set<string>()) {}

  has(name: string): boolean {
    return this.vars.has(name) || (this.parent?.has(name) ?? false)
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

  // Static methods that return new Scopes (immutable operations)

  static add(scope: Scope, ...names: string[]): Scope {
    const newVars = new Set(scope.vars)
    names.forEach((name) => newVars.add(name))
    return new Scope(scope.parent, newVars)
  }

  push(): Scope {
    return new Scope(this, new Set())
  }

  pop(): Scope {
    return this.parent ?? this
  }
}

// Tracker context that combines Scope with temporary pending identifiers
class TrackerContext {
  constructor(public scope: Scope, public pendingIds: string[] = []) {}
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

export const trackScope = new ContextTracker<TrackerContext>({
  start: new TrackerContext(new Scope(null, new Set())),

  shift(context, term, stack, input) {
    if (term !== terms.AssignableIdentifier) return context

    const text = readIdentifierText(input, input.pos, stack.pos)
    return new TrackerContext(context.scope, [...context.pendingIds, text])
  },

  reduce(context, term) {
    // Add assignment variable to scope
    if (term === terms.Assign) {
      const varName = context.pendingIds.at(-1)
      if (!varName) return context
      return new TrackerContext(Scope.add(context.scope, varName), context.pendingIds.slice(0, -1))
    }

    // Push new scope and add all parameters
    if (term === terms.Params) {
      let newScope = context.scope.push()
      if (context.pendingIds.length > 0) {
        newScope = Scope.add(newScope, ...context.pendingIds)
      }
      return new TrackerContext(newScope, [])
    }

    // Pop scope when exiting function
    if (term === terms.FunctionDef) {
      return new TrackerContext(context.scope.pop(), [])
    }

    return context
  },

  hash: (context) => context.scope.hash(),
})
