import { basicSetup } from 'codemirror'
import { EditorView } from '@codemirror/view'
import { shrimpTheme } from '#editor/plugins/theme'
import { shrimpLanguage } from '#/editor/plugins/shrimpLanguage'
import { shrimpHighlighting } from '#editor/plugins/theme'
import { shrimpKeymap } from '#editor/plugins/keymap'
import { log } from '#utils/utils'
import { Signal } from '#utils/signal'
import { shrimpErrors } from '#editor/plugins/errors'
import { ViewPlugin, ViewUpdate } from '@codemirror/view'
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
            parent: ref,
            doc: getContent(),
            extensions: [
              shrimpKeymap,
              basicSetup,
              shrimpTheme,
              shrimpLanguage,
              shrimpHighlighting,
              shrimpErrors,
              debugTags,
              persistencePlugin,
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

const persistencePlugin = ViewPlugin.fromClass(
  class {
    saveTimeout?: ReturnType<typeof setTimeout>

    update(update: ViewUpdate) {
      if (update.docChanged) {
        if (this.saveTimeout) clearTimeout(this.saveTimeout)

        this.saveTimeout = setTimeout(() => {
          setContent(update.state.doc.toString())
        }, 1000)
      }
    }

    destroy() {
      if (this.saveTimeout) clearTimeout(this.saveTimeout)
    }
  }
)

const getContent = () => {
  return localStorage.getItem('shrimp-editor-content') || ''
}

const setContent = (data: string) => {
  localStorage.setItem('shrimp-editor-content', data)
}
