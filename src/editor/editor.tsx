import { basicSetup } from 'codemirror'
import { EditorView } from '@codemirror/view'
import { shrimpTheme } from '#editor/plugins/theme'
import { shrimpLanguage } from '#/editor/plugins/shrimpLanguage'
import { shrimpHighlighting } from '#editor/plugins/theme'
import { shrimpKeymap } from '#editor/plugins/keymap'
import { asciiEscapeToHtml, log, toElement } from '#utils/utils'
import { Signal } from '#utils/signal'
import { shrimpErrors } from '#editor/plugins/errors'
import { debugTags } from '#editor/plugins/debugTags'
import { getContent, persistencePlugin } from '#editor/plugins/persistence'

import '#editor/editor.css'
import type { HtmlEscapedString } from 'hono/utils/html'

export const Editor = () => {
  return (
    <>
      <div
        ref={(ref: Element) => {
          if (ref?.querySelector('.cm-editor')) return
          const view = new EditorView({
            parent: ref,
            doc: getContent(),
            extensions: [
              shrimpKeymap,
              basicSetup,
              shrimpTheme,
              shrimpLanguage,
              shrimpHighlighting,
              shrimpErrors,
              persistencePlugin,
              debugTags,
            ],
          })

          requestAnimationFrame(() => view.focus())
        }}
      />
      <div id="status-bar">
        <div className="left"></div>
        <div className="right"></div>
      </div>
      <div id="output"></div>
      <div id="error"></div>
    </>
  )
}

export const outputSignal = new Signal<{ output: string } | { error: string }>()

let outputTimeout: ReturnType<typeof setTimeout>

outputSignal.connect((output) => {
  const el = document.querySelector('#output')!
  el.innerHTML = ''
  let content
  if ('error' in output) {
    el.classList.add('error')
    content = output.error
  } else {
    el.classList.remove('error')
    content = output.output
  }

  el.innerHTML = asciiEscapeToHtml(content)
})

type StatusBarMessage = {
  side: 'left' | 'right'
  message: string | Promise<HtmlEscapedString>
  className: string
  order?: number
}
export const statusBarSignal = new Signal<StatusBarMessage>()
statusBarSignal.connect(async ({ side, message, className, order }) => {
  document.querySelector(`#status-bar .${className}`)?.remove()

  const sideEl = document.querySelector(`#status-bar .${side}`)!
  const messageEl = (
    <div data-order={order ?? 0} className={className}>
      {await message}
    </div>
  )

  // Now go through the nodes and put it in the right spot based on order. Higher number means further right
  const nodes = Array.from(sideEl.childNodes)
  const index = nodes.findIndex((node) => {
    if (!(node instanceof HTMLElement)) return false
    return Number(node.dataset.order) > (order ?? 0)
  })

  if (index === -1) {
    sideEl.appendChild(toElement(messageEl))
  } else {
    sideEl.insertBefore(toElement(messageEl), nodes[index]!)
  }
})
