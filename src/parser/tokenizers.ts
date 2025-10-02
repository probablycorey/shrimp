import { ExternalTokenizer, InputStream, Stack } from '@lezer/lr'
import { CommandPartial, Command, Identifier, UnquotedArg, insertedSemi } from './shrimp.terms'
import { matchingCommands } from '#editor/commands'

export const tokenizer = new ExternalTokenizer((input: InputStream, stack: Stack) => {
  let ch = getFullCodePoint(input, 0)
  if (!isLowercaseLetter(ch) && !isEmoji(ch)) return

  let pos = getCharSize(ch)
  let text = String.fromCodePoint(ch)

  // Continue consuming identifier characters
  while (true) {
    ch = getFullCodePoint(input, pos)

    if (isLowercaseLetter(ch) || isDigit(ch) || ch === 45 /* - */ || isEmoji(ch)) {
      text += String.fromCodePoint(ch)
      pos += getCharSize(ch)
    } else {
      break
    }
  }

  input.advance(pos)

  if (!stack.canShift(Command) && !stack.canShift(CommandPartial)) {
    input.acceptToken(Identifier)
    return
  }

  const { match, partialMatches } = matchingCommands(text)
  if (match) {
    input.acceptToken(Command)
  } else if (partialMatches.length > 0) {
    input.acceptToken(CommandPartial)
  } else {
    input.acceptToken(Identifier)
  }
})

export const argTokenizer = new ExternalTokenizer((input: InputStream, stack: Stack) => {
  // Only match if we're in a command argument position
  if (!stack.canShift(UnquotedArg)) return

  const firstCh = input.peek(0)

  // Don't match if it starts with tokens we handle elsewhere
  if (
    firstCh === 39 /* ' */ ||
    firstCh === 40 /* ( */ ||
    firstCh === 45 /* - (for negative numbers) */ ||
    (firstCh >= 48 && firstCh <= 57) /* 0-9 (numbers) */
  )
    return

  // Read everything that's not a space, newline, or paren
  let pos = 0
  while (true) {
    const ch = input.peek(pos)
    if (
      ch === -1 ||
      ch === 32 /* space */ ||
      ch === 10 /* \n */ ||
      ch === 40 /* ( */ ||
      ch === 41 /* ) */ ||
      ch === 61 /* = */
    )
      break
    pos++
  }

  if (pos > 0) {
    input.advance(pos)
    input.acceptToken(UnquotedArg)
  }
})

export const insertSemicolon = new ExternalTokenizer((input: InputStream, stack: Stack) => {
  const next = input.peek(0)

  // We're at a newline or end of file
  if (next === 10 /* \n */ || next === -1 /* EOF */) {
    // Check if insertedSemi would be valid here
    if (stack.canShift(insertedSemi)) {
      // Don't advance! Virtual token has zero width
      input.acceptToken(insertedSemi, 0)
    }
  }
})

const isLowercaseLetter = (ch: number): boolean => {
  return ch >= 97 && ch <= 122 // a-z
}

const isDigit = (ch: number): boolean => {
  return ch >= 48 && ch <= 57 // 0-9
}

const getFullCodePoint = (input: InputStream, pos: number): number => {
  const ch = input.peek(pos)

  // Check if this is a high surrogate (0xD800-0xDBFF)
  if (ch >= 0xd800 && ch <= 0xdbff) {
    const low = input.peek(pos + 1)
    // Check if next is low surrogate (0xDC00-0xDFFF)
    if (low >= 0xdc00 && low <= 0xdfff) {
      // Combine surrogate pair into full code point
      return 0x10000 + ((ch & 0x3ff) << 10) + (low & 0x3ff)
    }
  }

  return ch // Single code unit
}

const isEmoji = (ch: number): boolean => {
  return (
    // Basic Emoticons
    (ch >= 0x1f600 && ch <= 0x1f64f) ||
    // Miscellaneous Symbols and Pictographs
    (ch >= 0x1f300 && ch <= 0x1f5ff) ||
    // Transport and Map Symbols
    (ch >= 0x1f680 && ch <= 0x1f6ff) ||
    // Regional Indicator Symbols (flags)
    (ch >= 0x1f1e6 && ch <= 0x1f1ff) ||
    // Miscellaneous Symbols (hearts, stars, weather)
    (ch >= 0x2600 && ch <= 0x26ff) ||
    // Dingbats (scissors, pencils, etc)
    (ch >= 0x2700 && ch <= 0x27bf) ||
    // Supplemental Symbols and Pictographs (newer emojis)
    (ch >= 0x1f900 && ch <= 0x1f9ff) ||
    // Symbols and Pictographs Extended-A (newest emojis)
    (ch >= 0x1fa70 && ch <= 0x1faff) ||
    // Various Asian Characters with emoji presentation
    (ch >= 0x1f018 && ch <= 0x1f270) ||
    // Variation Selectors (for emoji presentation)
    (ch >= 0xfe00 && ch <= 0xfe0f) ||
    // Additional miscellaneous items
    (ch >= 0x238c && ch <= 0x2454) ||
    // Combining Diacritical Marks for Symbols
    (ch >= 0x20d0 && ch <= 0x20ff)
  )
}

const getCharSize = (ch: number) => (ch > 0xffff ? 2 : 1) // emoji takes 2 UTF-16 code units
