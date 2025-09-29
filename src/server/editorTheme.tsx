import { EditorView } from '@codemirror/view'
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language'
import { tags } from '@lezer/highlight'

const highlightStyle = HighlightStyle.define([
  { tag: tags.keyword, color: '#C792EA' }, // fn - soft purple (Night Owl inspired)
  { tag: tags.name, color: '#82AAFF' }, // identifiers - bright blue (Night Owl style)
  { tag: tags.string, color: '#C3E88D' }, // strings - soft green
  { tag: tags.number, color: '#F78C6C' }, // numbers - warm orange
  { tag: tags.bool, color: '#FF5370' }, // booleans - coral red
  { tag: tags.operator, color: '#89DDFF' }, // operators - cyan blue
  { tag: tags.paren, color: '#676E95' }, // parens - muted blue-gray
  {
    tag: tags.definition(tags.variableName),
    color: '#FFCB6B', // warm yellow
    backgroundColor: '#1E2A4A', // dark blue background
    padding: '1px 2px',
    borderRadius: '2px',
    fontWeight: '500',
  },
])

export const shrimpHighlighting = syntaxHighlighting(highlightStyle)

export const editorTheme = EditorView.theme(
  {
    '&': {
      color: '#D6DEEB', // Night Owl text color
      backgroundColor: '#011627', // Night Owl dark blue
      fontFamily: '"Pixeloid Mono", "Courier New", monospace',
      fontSize: '18px',
      height: '100%',
    },
    '.cm-content': {
      caretColor: '#80A4C2', // soft blue caret
      padding: '0px',
      minHeight: '100px',
      borderBottom: '3px solid #1E2A4A',
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
  },
  { dark: true }
)
