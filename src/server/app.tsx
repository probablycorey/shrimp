import { Editor } from '@/server/editor'
import { render } from 'hono/jsx/dom'
import './index.css'

const App = () => {
  return (
    <div className="">
      <Editor />
    </div>
  )
}

const root = document.getElementById('root')!
render(<App />, root)
