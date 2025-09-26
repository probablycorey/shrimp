import { basicSetup } from 'codemirror'
import { EditorView } from '@codemirror/view'
import { editorTheme } from './editorTheme'

export const Editor = () => {
  return (
    <div
      ref={(ref: Element) => {
        if (ref?.querySelector('.cm-editor')) return

        console.log('init editor')
        new EditorView({
          doc: '',
          parent: ref,
          extensions: [basicSetup, editorTheme],
        })
      }}
    />
  )
}

export const Output = ({ children }: { children: string }) => {
  return <div className="terminal-output">{children}</div>
}
