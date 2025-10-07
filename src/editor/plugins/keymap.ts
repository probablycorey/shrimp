import { outputSignal } from '#editor/editor'
import { evaluate } from '#interpreter/evaluator'
import { parser } from '#parser/shrimp'
import { errorMessage, log } from '#utils/utils'
import { keymap } from '@codemirror/view'

export const shrimpKeymap = keymap.of([
  {
    key: 'Cmd-Enter',
    run: (view) => {
      const input = view.state.doc.toString()
      const context = new Map<string, any>()
      try {
        const tree = parser.parse(input)
        const output = evaluate(input, tree, context)
        outputSignal.emit({ output: String(output) })
      } catch (error) {
        log.error(error)
        outputSignal.emit({ error: `${errorMessage(error)}` })
      }
      return true
    },
  },
])
