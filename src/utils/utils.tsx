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

export function assert(condition: any, message: string): asserts condition {
  if (!condition) {
    throw new Error(message)
  }
}

export const toElement = (node: any): HTMLElement => {
  const c = document.createElement('div')
  render(node, c)
  return c.firstElementChild as HTMLElement
}

export const assertNever = (x: never): never => {
  throw new Error(`Unexpected object: ${x}`)
}

type HtmlEscapedString = string & { __htmlEscaped: true }

const ansiCodeToCssVar = (code: number): string | null => {
  // Foreground colors (30-37)
  if (code === 30) return '--ansi-black'
  if (code === 31) return '--ansi-red'
  if (code === 32) return '--ansi-green'
  if (code === 33) return '--ansi-yellow'
  if (code === 34) return '--ansi-blue'
  if (code === 35) return '--ansi-magenta'
  if (code === 36) return '--ansi-cyan'
  if (code === 37) return '--ansi-white'

  // Background colors (40-47)
  if (code === 40) return '--ansi-black'
  if (code === 41) return '--ansi-red'
  if (code === 42) return '--ansi-green'
  if (code === 43) return '--ansi-yellow'
  if (code === 44) return '--ansi-blue'
  if (code === 45) return '--ansi-magenta'
  if (code === 46) return '--ansi-cyan'
  if (code === 47) return '--ansi-white'

  // Bright foreground colors (90-97)
  if (code === 90) return '--ansi-bright-black'
  if (code === 91) return '--ansi-bright-red'
  if (code === 92) return '--ansi-bright-green'
  if (code === 93) return '--ansi-bright-yellow'
  if (code === 94) return '--ansi-bright-blue'
  if (code === 95) return '--ansi-bright-magenta'
  if (code === 96) return '--ansi-bright-cyan'
  if (code === 97) return '--ansi-bright-white'

  // Bright background colors (100-107)
  if (code === 100) return '--ansi-bright-black'
  if (code === 101) return '--ansi-bright-red'
  if (code === 102) return '--ansi-bright-green'
  if (code === 103) return '--ansi-bright-yellow'
  if (code === 104) return '--ansi-bright-blue'
  if (code === 105) return '--ansi-bright-magenta'
  if (code === 106) return '--ansi-bright-cyan'
  if (code === 107) return '--ansi-bright-white'

  return null
}

export const asciiEscapeToHtml = (str: string): HtmlEscapedString => {
  let result = ''
  let openSpans = 0

  const parts = str.split(/\x1b\[(.*?)m/)

  for (let i = 0; i < parts.length; i++) {
    if (i % 2 === 0) {
      // Regular text
      result += parts[i]
      continue
    }

    // ANSI escape code
    const codes = parts[i]!.split(';').map((code) => parseInt(code, 10))

    for (const code of codes) {
      if (code === 0) {
        // Reset - close all open spans
        result += '</span>'.repeat(openSpans)
        openSpans = 0
      } else if (code === 1) {
        // Bold
        result += '<span style="font-weight: bold;">'
        openSpans++
      } else if (code >= 30 && code <= 37) {
        // Foreground color
        const cssVar = ansiCodeToCssVar(code)
        if (cssVar) {
          result += `<span style="color: var(${cssVar});">`
          openSpans++
        }
      } else if (code >= 40 && code <= 47) {
        // Background color
        const cssVar = ansiCodeToCssVar(code)
        if (cssVar) {
          result += `<span style="background-color: var(${cssVar});">`
          openSpans++
        }
      } else if (code >= 90 && code <= 97) {
        // Bright foreground color
        const cssVar = ansiCodeToCssVar(code)
        if (cssVar) {
          result += `<span style="color: var(${cssVar});">`
          openSpans++
        }
      } else if (code >= 100 && code <= 107) {
        // Bright background color
        const cssVar = ansiCodeToCssVar(code)
        if (cssVar) {
          result += `<span style="background-color: var(${cssVar});">`
          openSpans++
        }
      }
    }
  }

  // Close any remaining spans
  result += '</span>'.repeat(openSpans)

  return result as HtmlEscapedString
}
