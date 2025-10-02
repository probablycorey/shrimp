import { Editor } from '#/editor/editor'
import { render } from 'hono/jsx/dom'
import './index.css'

const App = () => {
  return <Editor />
}

const root = document.getElementById('root')!
render(<App />, root)
