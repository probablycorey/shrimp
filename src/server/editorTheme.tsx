import { EditorView } from '@codemirror/view'

export const editorTheme = EditorView.theme(
  {
    '&': {
      color: '#7C70DA',
      backgroundColor: '#40318D',
      fontFamily: '"Pixeloid Mono", "Courier New", monospace',
      fontSize: '18px',
      height: '100%',
    },
    '.cm-content': {
      caretColor: '#7C70DA',
      padding: '0px',
      minHeight: '100px',
      borderBottom: '3px solid #7C70DA',
    },
    '.cm-activeLine': {
      backgroundColor: 'transparent',
    },
    '&.cm-focused .cm-cursor': {
      borderLeftColor: '#7C70DA',
    },
    '&.cm-focused .cm-selectionBackground, ::selection': {
      backgroundColor: '#5A4FCF',
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
