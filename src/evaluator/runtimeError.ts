export class RuntimeError extends Error {
  constructor(message: string, private from: number, private to: number) {
    super(message)
    this.name = 'RuntimeError'
    this.message = message
  }

  toReadableString(input: string) {
    const pointer = ' '.repeat(this.from) + '^'.repeat(this.to - this.from)
    const message = `${this.message} at "${input.slice(this.from, this.to)}" (${this.from}:${
      this.to
    })`

    return `${input}\n${pointer}\n${message}`
  }
}
