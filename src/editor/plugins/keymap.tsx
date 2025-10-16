import { statusBarSignal } from '#editor/editor'
import { run } from '#editor/runCode'
import { EditorState } from '@codemirror/state'
import { keymap } from '@codemirror/view'

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

let firstTime = true
const singleLineFilter = EditorState.transactionFilter.of((transaction) => {
  if (multilineMode) return transaction // Allow everything in multiline mode

  if (firstTime) {
    firstTime = false
    if (transaction.newDoc.toString().includes('\n')) {
      multilineMode = true
      updateStatusMessage()
      return transaction
    }
  }

  transaction.changes.iterChanges((fromA, toA, fromB, toB, inserted) => {
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
