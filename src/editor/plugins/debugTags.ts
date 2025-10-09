import { EditorView, ViewPlugin, ViewUpdate } from '@codemirror/view'
import { syntaxTree } from '@codemirror/language'
import { statusBarSignal } from '#editor/editor'

export const debugTags = ViewPlugin.fromClass(
  class {
    update(update: ViewUpdate) {
      if (update.docChanged || update.selectionSet || update.geometryChanged) {
        this.updateStatusBar(update.view)
      }
    }

    updateStatusBar(view: EditorView) {
      const pos = view.state.selection.main.head + 1
      const tree = syntaxTree(view.state)

      let tags: string[] = []
      let node = tree.resolveInner(pos, -1)

      while (node) {
        tags.push(node.type.name)
        node = node.parent!
        if (!node) break
      }

      const debugText = tags.length ? tags.reverse().slice(1).join(' > ') : 'No nodes'
      statusBarSignal.emit({
        side: 'right',
        message: debugText,
        className: 'debug-tags',
        order: -1,
      })
    }
  }
)
