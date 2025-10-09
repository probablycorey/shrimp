import { ViewPlugin, ViewUpdate } from '@codemirror/view'

export const persistencePlugin = ViewPlugin.fromClass(
  class {
    saveTimeout?: ReturnType<typeof setTimeout>

    update(update: ViewUpdate) {
      if (update.docChanged) {
        if (this.saveTimeout) clearTimeout(this.saveTimeout)

        this.saveTimeout = setTimeout(() => {
          setContent(update.state.doc.toString())
        }, 500)
      }
    }

    destroy() {
      if (this.saveTimeout) clearTimeout(this.saveTimeout)
    }
  }
)

export const getContent = () => {
  return localStorage.getItem('shrimp-editor-content') || ''
}

const setContent = (data: string) => {
  localStorage.setItem('shrimp-editor-content', data)
}
