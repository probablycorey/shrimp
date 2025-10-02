import { EditorView, ViewPlugin, ViewUpdate } from '@codemirror/view'
import { syntaxTree } from '@codemirror/language'

export const debugTags = ViewPlugin.fromClass(
  class {
    update(update: ViewUpdate) {
      if (update.docChanged || update.selectionSet || update.geometryChanged) {
        this.updateStatusBar(update.view)
      }
    }

    updateStatusBar(view: EditorView) {
      const pos = view.state.selection.main.head
      const tree = syntaxTree(view.state)

      let tags: string[] = []
      let node = tree.resolveInner(pos, -1)

      while (node) {
        tags.push(node.type.name)
        node = node.parent!
        if (!node) break
      }

      const debugText = tags.length ? tags.reverse().slice(1).join(' > ') : 'No nodes'
      const statusBar = document.querySelector('#status-bar')
      if (statusBar) {
        statusBar.textContent = debugText
      }
    }
  }
)
