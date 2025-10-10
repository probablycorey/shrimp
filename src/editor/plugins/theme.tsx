import { EditorView } from '@codemirror/view'
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language'
import { tags } from '@lezer/highlight'

const highlightStyle = HighlightStyle.define([
  { tag: tags.keyword, color: '#C792EA' },
  { tag: tags.name, color: '#82AAFF' },
  { tag: tags.string, color: '#C3E88D' },
  { tag: tags.number, color: '#F78C6C' },
  { tag: tags.bool, color: '#FF5370' },
  { tag: tags.operator, color: '#89DDFF' },
  { tag: tags.paren, color: '#676E95' },
  { tag: tags.function(tags.variableName), color: '#FF9CAC' },
  { tag: tags.function(tags.invalid), color: 'white' },
  {
    tag: tags.definition(tags.variableName),
    color: '#FFCB6B',
    backgroundColor: '#1E2A4A',
    padding: '1px 2px',
    borderRadius: '2px',
    fontWeight: '500',
  },
])

export const shrimpHighlighting = syntaxHighlighting(highlightStyle)

export const shrimpTheme = EditorView.theme(
  {
    '&': {
      color: '#D6DEEB', // Night Owl text color
      backgroundColor: '#011627', // Night Owl dark blue
      height: '100%',
      fontSize: '18px',
    },
    '.cm-content': {
      fontFamily: '"Pixeloid Mono", "Courier New", monospace',
      caretColor: '#80A4C2', // soft blue caret
      padding: '0px',
    },
    '.cm-activeLine': {
      backgroundColor: 'transparent',
    },
    '&.cm-focused .cm-cursor': {
      borderLeftColor: '#80A4C2',
    },
    '&.cm-focused .cm-selectionBackground, ::selection': {
      backgroundColor: '#1D3B53', // darker blue selection
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
      backgroundColor: '#FF5370',
    },
    '.cm-nonmatchingBracket': {
      backgroundColor: '#C3E88D',
    },
  },
  { dark: true }
)
