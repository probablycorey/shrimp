import { render } from 'hono/jsx/dom'

export type Timeout = ReturnType<typeof setTimeout>

export const log = (...args: any[]) => console.log(...args)
log.error = (...args: any[]) => console.error(`💥 ${args.join(' ')}`)

export const errorMessage = (error: unknown) => {
  if (error instanceof Error) {
    return error.message
  }
  return String(error)
}

export function assert(condition: boolean, message: string): asserts condition {
  if (!condition) {
    throw new Error(message)
  }
}

export const toElement = (node: any): HTMLElement => {
  const c = document.createElement('div')
  render(node, c)
  return c.firstElementChild as HTMLElement
}
