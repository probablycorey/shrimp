import { ContextTracker } from '@lezer/lr'
import { Assignment } from '#parser/shrimp.terms'

interface ParserContext {
  definedVariables: Set<string>
}

export const contextTracker = new ContextTracker<ParserContext>({
  start: { definedVariables: new Set() },

  reduce(context, term, stack, input) {
    console.log(`🤏 REDUCE`, termToString(term))
    if (term !== Assignment) return context

    return context
  },

  shift(context, term, stack, input) {
    console.log(`  ⇧ SHIFT `, termToString(term))
    return context
  },
})

const termToString = (term: number) => {
  return Object.entries(require('./shrimp.terms')).find(([k, v]) => v === term)?.[0] || term
}
