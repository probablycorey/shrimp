import { ExternalTokenizer, InputStream, Stack } from '@lezer/lr'
import { Identifier, Word } from './shrimp.terms'

// The only chars that can't be words are whitespace, apostrophes, closing parens, and EOF.

export const tokenizer = new ExternalTokenizer((input: InputStream, stack: Stack) => {
  let ch = getFullCodePoint(input, 0)
  if (!isWordChar(ch)) return

  let pos = getCharSize(ch)
  let isValidIdentifier = isLowercaseLetter(ch) || isEmoji(ch)
  const canBeWord = stack.canShift(Word)

  while (true) {
    ch = getFullCodePoint(input, pos)

    if (!isWordChar(ch)) break

    // Handle backslash escapes: consume backslash + next char
    if (ch === 92 /* \ */) {
      isValidIdentifier = false
      pos += getCharSize(ch) // skip backslash
      const nextCh = getFullCodePoint(input, pos)
      if (nextCh !== -1) { // if not EOF
        pos += getCharSize(nextCh) // skip escaped char
      }
      continue
    }

    // Certain characters might end a word or identifier if they are followed by whitespace.
    // This allows things like `a = hello; 2` of if `x: y` to parse correctly.
    if (canBeWord && (ch === 59 /* ; */ || ch === 58) /* : */) {
      const nextCh = getFullCodePoint(input, pos + 1)
      if (!isWordChar(nextCh)) break
    }

    // Track identifier validity
    if (!isLowercaseLetter(ch) && !isDigit(ch) && ch !== 45 && !isEmoji(ch)) {
      if (!canBeWord) break
      isValidIdentifier = false
    }

    pos += getCharSize(ch)
  }

  input.advance(pos)
  input.acceptToken(isValidIdentifier ? Identifier : Word)
})

const isWhiteSpace = (ch: number): boolean => {
  return ch === 32 /* space */ || ch === 10 /* \n */ || ch === 9 /* tab */ || ch === 13 /* \r */
}

const isWordChar = (ch: number): boolean => {
  const closingParen = ch === 41 /* ) */
  const eof = ch === -1

  return !isWhiteSpace(ch) && !closingParen && !eof
}

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
