export class CompilerError extends Error {
  constructor(message: string, private from: number, private to: number) {
    super(message)
    this.name = 'CompilerError'
    this.message = message
  }

  // This code is A MESS, but I don't really care because once we get it right we'll never touch it again.
  toReadableString(input: string) {
    const lineInfo = this.lineAtPosition(input)
    if (!lineInfo) {
      return `${this.message} at position ${this.from}:${this.to}`
    }

    const { lineNumber, columnStart, columnEnd } = lineInfo
    const previousSevenLines = input.split('\n').slice(Math.max(0, lineNumber - 8), lineNumber)
    const padding = lineNumber.toString().length
    const ws = ' '.repeat(padding + 1)
    const lines = previousSevenLines
      .map((line, index) => {
        const currentLineNumber = lineNumber - previousSevenLines.length + index + 1
        return `${grey(currentLineNumber.toString().padStart(padding))} │ ${line}`
      })
      .join('\n')

    const underlineStartLen = (columnEnd - columnStart) / 2
    const underlineEndLen = columnEnd - columnStart - underlineStartLen
    const underline =
      ' '.repeat(columnStart - 1) +
      '─'.repeat(underlineStartLen) +
      '┬' +
      '─'.repeat(underlineEndLen)

    const messageWithArrow =
      ' '.repeat(columnStart + underlineStartLen - 1) + '╰── ' + blue(this.message)

    const message = `${green('')}
${ws}╭───┨ ${red('Compiler Error')} ┃
${ws}│
${lines}
${ws}│ ${underline}
${ws}│ ${messageWithArrow}
${ws}╰───
    `

    return `${message}`
  }

  lineAtPosition(input: string) {
    const lines = input.split('\n')
    let currentPos = 0

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]!
      if (this.from >= currentPos && this.from <= currentPos + line.length) {
        const columnStart = this.from - currentPos + 1
        const columnEnd = columnStart + (this.to - this.from) - 1

        // If the error spans multiple lines, so just return the line start
        if (columnEnd > line.length) {
          return { lineNumber: i + 1, columnStart, columnEnd: line.length, text: line }
        }
        return { lineNumber: i + 1, columnStart, columnEnd, text: line }
      }
      currentPos += line.length + 1 // +1 for the newline character
    }
  }
}

const red = (text: string) => `\x1b[31m${text}\x1b[0m`
const green = (text: string) => `\x1b[32m${text}\x1b[0m`
const blue = (text: string) => `\x1b[34m${text}\x1b[0m`
const grey = (text: string) => `\x1b[90m${text}\x1b[0m`
const underline = (text: string) => `\x1b[4m${text}\x1b[0m`
const bold = (text: string) => `\x1b[1m${text}\x1b[0m`
