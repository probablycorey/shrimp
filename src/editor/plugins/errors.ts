import { parser } from '#parser/shrimp'
import type { Timeout } from '#utils/utils'
import { Range } from '@codemirror/state'
import {
  Decoration,
  EditorView,
  ViewPlugin,
  ViewUpdate,
  type DecorationSet,
} from '@codemirror/view'

export const shrimpErrors = ViewPlugin.fromClass(
  class {
    timeout?: Timeout
    decorations: DecorationSet = Decoration.none

    constructor(view: EditorView) {
      this.updateErrors(view)
    }

    update(update: ViewUpdate) {
      if (update.docChanged) {
        this.debounceUpdate(update.view)
      }
    }

    updateErrors(view: EditorView) {
      this.decorations = Decoration.none
      try {
        const decorations: Range<Decoration>[] = []
        const tree = parser.parse(view.state.doc.toString())
        tree.iterate({
          enter: (node) => {
            if (!node.type.isError) return

            // Skip empty error nodes
            if (node.from === node.to) return

            const decoration = Decoration.mark({
              class: 'syntax-error',
              attributes: { title: 'COREY REPLACE THIS' },
            }).range(node.from, node.to)
            decorations.push(decoration)
          },
        })

        this.decorations = Decoration.set(decorations)
        // requestAnimationFrame(() => view.dispatch({}))
      } catch (e) {
        console.error('🙈 Error parsing document', e)
      }
    }

    debounceUpdate = (view: EditorView) => {
      clearTimeout(this.timeout)
      this.timeout = setTimeout(() => this.updateErrors(view), 250)
    }
  },
  {
    decorations: (v) => v.decorations,
  }
)
