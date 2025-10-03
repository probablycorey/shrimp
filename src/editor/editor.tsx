import { basicSetup } from 'codemirror'
import { EditorView } from '@codemirror/view'
import { shrimpTheme } from '#editor/theme'
import { shrimpLanguage } from '#/editor/shrimpLanguage'
import { shrimpHighlighting } from '#editor/theme'
import { shrimpKeymap } from '#editor/keymap'
import { log } from '#utils/utils'
import { Signal } from '#utils/signal'
import { shrimpErrors } from '#editor/plugins/errors'
import { inlineHints } from '#editor/plugins/inlineHints'
import { debugTags } from '#editor/plugins/debugTags'

export const outputSignal = new Signal<{ output: string } | { error: string }>()
outputSignal.connect((output) => {
  const outputEl = document.querySelector('#output')
  if (!outputEl) {
    log.error('Output element not found')
    return
  }

  if ('error' in output) {
    outputEl.innerHTML = `<div class="error">${output.error}</div>`
  } else {
    outputEl.textContent = output.output
  }
})

export const Editor = () => {
  return (
    <>
      <div
        ref={(ref: Element) => {
          if (ref?.querySelector('.cm-editor')) return
          const view = new EditorView({
            doc: defaultCode,
            parent: ref,
            extensions: [
              shrimpKeymap,
              basicSetup,
              shrimpTheme,
              shrimpLanguage(),
              shrimpHighlighting,
              shrimpErrors,
              // inlineHints,
              debugTags,
            ],
          })

          requestAnimationFrame(() => view.focus())
        }}
      />
      <div id="status-bar"></div>
      <div id="output"></div>
    </>
  )
}

const defaultCode = ``
