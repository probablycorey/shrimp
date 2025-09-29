import { basicSetup } from 'codemirror'
import { EditorView } from '@codemirror/view'
import { editorTheme } from './editorTheme'
import { shrimpLanguage } from './shrimpLanguage'
import { shrimpHighlighting } from './editorTheme'
import { debugTags } from '@/server/debugPlugin'

export const Editor = () => {
  return (
    <div
      ref={(ref: Element) => {
        if (ref?.querySelector('.cm-editor')) return

        console.log('init editor')
        new EditorView({
          doc: `a = 3
fn x y: x + y
aa = fn radius: 3.14 * radius * radius
b = true
c = "cyan"
`,
          parent: ref,
          extensions: [basicSetup, editorTheme, shrimpLanguage(), shrimpHighlighting],
        })
      }}
    />
  )
}

export const Output = ({ children }: { children: string }) => {
  return <div className="terminal-output">{children}</div>
}
