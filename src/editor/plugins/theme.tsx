import { EditorView } from '@codemirror/view'
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language'
import { tags } from '@lezer/highlight'

const highlightStyle = HighlightStyle.define([
  { tag: tags.keyword, color: 'var(--color-keyword)' },
  { tag: tags.name, color: 'var(--color-function)' },
  { tag: tags.string, color: 'var(--color-string)' },
  { tag: tags.number, color: 'var(--color-number)' },
  { tag: tags.bool, color: 'var(--color-bool)' },
  { tag: tags.operator, color: 'var(--color-operator)' },
  { tag: tags.paren, color: 'var(--color-paren)' },
  { tag: tags.regexp, color: 'var(--color-regex)' },
  { tag: tags.function(tags.variableName), color: 'var(--color-function-call)' },
  { tag: tags.function(tags.invalid), color: 'white' },
  {
    tag: tags.definition(tags.variableName),
    color: 'var(--color-variable-def)',
    backgroundColor: 'var(--bg-variable-def)',
    padding: '1px 2px',
    borderRadius: '2px',
    fontWeight: '500',
  },
])

export const shrimpHighlighting = syntaxHighlighting(highlightStyle)

export const shrimpTheme = EditorView.theme(
  {
    '&': {
      color: 'var(--text-editor)',
      backgroundColor: 'var(--bg-editor)',
      height: '100%',
      fontSize: '18px',
    },
    '.cm-content': {
      fontFamily: '"Pixeloid Mono", "Courier New", monospace',
      caretColor: 'var(--caret)',
      padding: '0px',
    },
    '.cm-activeLine': {
      backgroundColor: 'transparent',
    },
    '&.cm-focused .cm-cursor': {
      borderLeftColor: 'var(--caret)',
    },
    '&.cm-focused .cm-selectionBackground, ::selection': {
      backgroundColor: 'var(--bg-selection)',
    },
    '.cm-gutters': {
      display: 'none',
    },
    '.cm-editor': {
      border: 'none',
      outline: 'none',
      height: '100%',
    },
    '.cm-matchingBracket': {
      backgroundColor: 'var(--color-bool)',
    },
    '.cm-nonmatchingBracket': {
      backgroundColor: 'var(--color-string)',
    },
  },
  { dark: true }
)
