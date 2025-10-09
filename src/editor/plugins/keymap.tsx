import { outputSignal, statusBarSignal } from '#editor/editor'
import { EditorState } from '@codemirror/state'
import { Compiler } from '#compiler/compiler'
import { errorMessage, log } from '#utils/utils'
import { keymap } from '@codemirror/view'
import { VM } from 'reefvm'

let multilineMode = false
const customKeymap = keymap.of([
  {
    key: 'Enter',
    run: (view) => {
      if (multilineMode) return false

      const input = view.state.doc.toString()
      run(input)
      return true
    },
  },

  {
    key: 'Alt-Enter',
    run: (view) => {
      if (multilineMode) {
        const input = view.state.doc.toString()
        run(input)
        return true
      }

      multilineMode = true
      view.dispatch({
        changes: { from: view.state.doc.length, insert: '\n' },
        selection: { anchor: view.state.doc.length + 1 },
      })

      updateStatusMessage()
      return true
    },
  },
])

const singleLineFilter = EditorState.transactionFilter.of((transaction) => {
  if (multilineMode) return transaction // Allow everything in multiline mode

  transaction.changes.iterChanges((fromA, toA, fromB, toB, inserted) => {
    console.log(`🌭`, { string: inserted.toString(), newline: inserted.toString().includes('\n') })
    if (inserted.toString().includes('\n')) {
      multilineMode = true
      updateStatusMessage()
      return
    }
  })

  return transaction
})

export const shrimpKeymap = [customKeymap, singleLineFilter]

const updateStatusMessage = () => {
  statusBarSignal.emit({
    side: 'left',
    message: multilineMode ? 'Press Alt-Enter run' : 'Alt-Enter will enter multiline mode',
    className: 'status',
  })

  statusBarSignal.emit({
    side: 'right',
    message: (
      <div className="multiline">
        <span className={multilineMode ? 'dot active' : 'dot inactive'}>•</span> multiline
      </div>
    ),
    className: 'multiline-status',
  })
}

requestAnimationFrame(() => updateStatusMessage())

const run = async (input: string) => {
  try {
    const compiler = new Compiler(input)
    const vm = new VM(compiler.bytecode)
    const output = await vm.run()
    outputSignal.emit({ output: String(output.value) })
  } catch (error) {
    log.error(error)
    outputSignal.emit({ error: `${errorMessage(error)}` })
  }
}
