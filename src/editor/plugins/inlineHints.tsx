import {
  ViewPlugin,
  ViewUpdate,
  EditorView,
  Decoration,
  type DecorationSet,
} from '@codemirror/view'
import { syntaxTree } from '@codemirror/language'
import { type SyntaxNode } from '@lezer/common'
import { WidgetType } from '@codemirror/view'
import { toElement } from '#utils/utils'
import { matchingCommands } from '#editor/commands'
import * as Terms from '#parser/shrimp.terms'

const ghostTextTheme = EditorView.theme({
  '.ghost-text': {
    color: '#666',
    opacity: '0.6',
    fontStyle: 'italic',
  },
})

type Hint = { cursor: number; hintText?: string; completionText?: string }

export const inlineHints = [
  ViewPlugin.fromClass(
    class {
      decorations: DecorationSet = Decoration.none
      currentHint?: Hint

      update(update: ViewUpdate) {
        if (!update.docChanged && !update.selectionSet) return

        this.clearHints()
        let hint = this.getContext(update.view)
        this.currentHint = hint
        this.showHint(hint)
      }

      handleTab(view: EditorView) {
        if (!this.currentHint?.completionText) return false

        this.decorations = Decoration.none
        view.dispatch({
          changes: {
            from: this.currentHint.cursor,
            insert: this.currentHint.completionText,
          },
          selection: {
            anchor: this.currentHint.cursor + this.currentHint.completionText.length,
          },
        })
        this.currentHint = undefined
        return true
      }

      clearHints() {
        this.currentHint = undefined
        this.decorations = Decoration.none
      }

      getContext(view: EditorView): Hint {
        const cursor = view.state.selection.main.head

        const isCursorAtEnd = cursor === view.state.doc.length
        if (!isCursorAtEnd) return { cursor }

        const token = this.getCommandContextToken(view, cursor)
        if (!token) return { cursor }

        const text = view.state.doc.sliceString(token.from, token.to)
        const tokenId = token.type.id

        let completionText = ''
        let hintText = ''
        const justSpaces = view.state.doc.sliceString(cursor - 1, cursor) === ' '

        if (tokenId === Terms.CommandPartial) {
          const { partialMatches } = matchingCommands(text)
          const match = partialMatches[0]
          if (match) {
            completionText = match.command.slice(text.length) + ' '
            hintText = completionText
          }
        } else if (
          tokenId === Terms.Identifier &&
          token.parent?.type.id === Terms.Arg &&
          !justSpaces
        ) {
          const { availableArgs } = this.getCommandContext(view, token)
          const matchingArgs = availableArgs.filter((arg) => arg.name.startsWith(text))
          const match = matchingArgs[0]
          if (match) {
            hintText = `${match.name.slice(text.length)}=<${match.type}>`
            completionText = `${match.name.slice(text.length)}=`
          }
        } else if (this.containedBy(token, Terms.PartialNamedArg)) {
          const { availableArgs } = this.getCommandContext(view, token)
          const textWithoutEquals = text.slice(0, -1)
          const matchingArgs = availableArgs.filter((arg) => arg.name == textWithoutEquals)
          const match = matchingArgs[0]
          if (match) {
            hintText = `<${match.type}>`
            completionText = 'default' in match ? `${match.default}` : ''
          }
        } else {
          const { availableArgs } = this.getCommandContext(view, token)
          const nextArg = Array.from(availableArgs)[0]
          const space = justSpaces ? '' : ' '
          if (nextArg) {
            hintText = `${space}${nextArg.name}=<${nextArg.type}>`
            if (nextArg) {
              completionText = `${space}${nextArg.name}=`
            }
          }
        }

        return { completionText, hintText, cursor }
      }

      getCommandContextToken(view: EditorView, cursor: number) {
        const tree = syntaxTree(view.state)
        let node = tree.resolveInner(cursor, -1)

        // If we're in a CommandCall, return the token before cursor
        if (this.containedBy(node, Terms.CommandCall)) {
          return tree.resolveInner(cursor, -1)
        }

        // If we're in Program, look backward
        while (node.name === 'Program' && cursor > 0) {
          cursor -= 1
          node = tree.resolveInner(cursor, -1)
          if (this.containedBy(node, Terms.CommandCall)) {
            return tree.resolveInner(cursor, -1)
          }
        }
      }

      containedBy(node: SyntaxNode, nodeId: number): SyntaxNode | undefined {
        let current: SyntaxNode | undefined = node

        while (current) {
          if (current.type.id === nodeId) {
            return current
          }

          current = current.parent ?? undefined
        }
      }

      showHint(hint: Hint) {
        if (!hint.hintText) return

        const widget = new GhostTextWidget(hint.hintText)
        const afterCursor = 1
        const decoration = Decoration.widget({ widget, side: afterCursor }).range(hint.cursor)
        this.decorations = Decoration.set([decoration])
      }

      getCommandContext(view: EditorView, currentToken: SyntaxNode) {
        let commandCallNode = currentToken.parent
        while (commandCallNode?.type.name !== 'CommandCall') {
          if (!commandCallNode) {
            throw new Error('No CommandCall parent found, must be an error in the grammar')
          }
          commandCallNode = commandCallNode.parent
        }

        const commandToken = commandCallNode.firstChild
        if (!commandToken) {
          throw new Error('CommandCall has no children, must be an error in the grammar')
        }

        const commandText = view.state.doc.sliceString(commandToken.from, commandToken.to)
        const { match: commandShape } = matchingCommands(commandText)
        if (!commandShape) {
          throw new Error(`No command shape found for command "${commandText}"`)
        }

        let availableArgs = [...commandShape.args]

        // Walk through all NamedArg children
        let child = commandToken.nextSibling

        while (child) {
          console.log('child', child.type.name, child.to - child.from)
          if (child.type.id === Terms.NamedArg) {
            const argName = child.firstChild // Should be the Identifier
            if (argName) {
              const argText = view.state.doc.sliceString(argName.from, argName.to - 1)
              availableArgs = availableArgs.filter((arg) => arg.name !== argText)
            }
          } else if (child.type.id == Terms.Arg) {
            const hasSpaceAfter = view.state.doc.sliceString(child.to, child.to + 1) === ' '
            if (hasSpaceAfter) {
              availableArgs.shift()
            }
          }

          child = child.nextSibling
        }

        return { commandShape, availableArgs }
      }
    },
    {
      decorations: (v) => v.decorations,
      eventHandlers: {
        keydown(event, view) {
          if (event.key === 'Tab') {
            event.preventDefault()
            const plugin = view.plugin(inlineHints[0]! as ViewPlugin<any>)
            plugin?.handleTab(view)
          }
        },
      },
    }
  ),
  ghostTextTheme,
]

class GhostTextWidget extends WidgetType {
  constructor(private text: string) {
    super()
  }

  toDOM() {
    const el = <span className="ghost-text">{this.text}</span>
    return toElement(el)
  }
}
