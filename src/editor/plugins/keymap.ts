import { outputSignal } from '#editor/editor'
import { Compiler } from '#compiler/compiler'
import { errorMessage, log } from '#utils/utils'
import { keymap } from '@codemirror/view'
import { run, VM } from 'reefvm'

export const shrimpKeymap = keymap.of([
  {
    key: 'Cmd-Enter',
    run: (view) => {
      const input = view.state.doc.toString()
      runInput(input)
      return true
    },
  },
])

const runInput = async (input: string) => {
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
