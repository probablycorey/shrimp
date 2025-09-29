import { ExternalTokenizer, InputStream } from '@lezer/lr'
import { Identifier } from './shrimp.terms'

function isLowercaseLetter(ch: number): boolean {
  return ch >= 97 && ch <= 122 // a-z
}

function isDigit(ch: number): boolean {
  return ch >= 48 && ch <= 57 // 0-9
}

function getFullCodePoint(input: InputStream, pos: number): number {
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

function isEmoji(ch: number): boolean {
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

export const identifierTokenizer = new ExternalTokenizer((input: InputStream) => {
  const ch = getFullCodePoint(input, 0)

  if (isLowercaseLetter(ch) || isEmoji(ch)) {
    let pos = ch > 0xffff ? 2 : 1 // emoji takes 2 UTF-16 code units

    // Continue consuming identifier characters
    while (true) {
      const nextCh = getFullCodePoint(input, pos)

      if (
        isLowercaseLetter(nextCh) ||
        isDigit(nextCh) ||
        nextCh === 45 /* - */ ||
        isEmoji(nextCh)
      ) {
        pos += nextCh > 0xffff ? 2 : 1 // advance by 1 or 2 UTF-16 code units
      } else {
        break
      }
    }

    input.advance(pos) // advance by total length
    input.acceptToken(Identifier)
  }
})
