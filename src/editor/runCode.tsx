import { outputSignal } from '#editor/editor'
import { Compiler } from '#compiler/compiler'
import { errorMessage, log } from '#utils/utils'
import { VM } from 'reefvm'

export const run = async (input: string) => {
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
