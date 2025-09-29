import {
  EditorView,
  Decoration,
  ViewPlugin,
  ViewUpdate,
  WidgetType,
  type DecorationSet,
} from '@codemirror/view'
import { syntaxTree } from '@codemirror/language'

const createDebugWidget = (tags: string) =>
  Decoration.widget({
    widget: new (class extends WidgetType {
      toDOM() {
        const div = document.createElement('div')
        div.style.cssText = `
          position: fixed;
          top: 10px;
          right: 10px;
          background: #000;
          color: #00ff00;
          padding: 8px;
          font-family: monospace;
          font-size: 12px;
          border: 1px solid #333;
          z-index: 1000;
          max-width: 300px;
          word-wrap: break-word;
          white-space: pre-wrap;
        `
        div.textContent = tags
        return div
      }
    })(),
  })

export const debugTags = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet = Decoration.none

    constructor(view: EditorView) {
      this.updateDecorations(view)
    }

    update(update: ViewUpdate) {
      if (update.docChanged || update.selectionSet) {
        this.updateDecorations(update.view)
      }
    }

    updateDecorations(view: EditorView) {
      const pos = view.state.selection.main.head
      const tree = syntaxTree(view.state)

      let tags: string[] = []
      let node = tree.resolveInner(pos, -1)

      while (node) {
        tags.push(node.type.name)
        node = node.parent!
        if (!node) break
      }

      const debugText = tags.length ? tags.join(' > ') : 'No nodes'
      this.decorations = Decoration.set([createDebugWidget(debugText).range(pos)])
    }
  },
  {
    decorations: (v) => v.decorations,
  }
)
