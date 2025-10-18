import { ExternalTokenizer, InputStream, Stack } from '@lezer/lr'
import { Identifier, AssignableIdentifier, Word, IdentifierBeforeDot } from './shrimp.terms'
import type { ScopeContext } from './scopeTracker'

// The only chars that can't be words are whitespace, apostrophes, closing parens, and EOF.

export const tokenizer = new ExternalTokenizer(
  (input: InputStream, stack: Stack) => {
    const ch = getFullCodePoint(input, 0)
    if (!isWordChar(ch)) return

    const isValidStart = isLowercaseLetter(ch) || isEmoji(ch)
    const canBeWord = stack.canShift(Word)

    // Consume all word characters, tracking if it remains a valid identifier
    const { pos, isValidIdentifier, stoppedAtDot } = consumeWordToken(
      input,
      isValidStart,
      canBeWord
    )

    // Check if we should emit IdentifierBeforeDot for property access
    if (stoppedAtDot) {
      const dotGetToken = checkForDotGet(input, stack, pos)

      if (dotGetToken) {
        input.advance(pos)
        input.acceptToken(dotGetToken)
      } else {
        // Not in scope - continue consuming the dot as part of the word
        const afterDot = consumeRestOfWord(input, pos + 1, canBeWord)
        input.advance(afterDot)
        input.acceptToken(Word)
      }

      return
    }

    // Advance past the token we consumed
    input.advance(pos)

    // Choose which token to emit
    if (isValidIdentifier) {
      const token = chooseIdentifierToken(input, stack)
      input.acceptToken(token)
    } else {
      input.acceptToken(Word)
    }
  },
  { contextual: true }
)

// Build identifier text from input stream, handling surrogate pairs for emoji
const buildIdentifierText = (input: InputStream, length: number): string => {
  let text = ''
  for (let i = 0; i < length; i++) {
    const charCode = input.peek(i)
    if (charCode === -1) break

    // Handle surrogate pairs for emoji (UTF-16 encoding)
    if (charCode >= 0xd800 && charCode <= 0xdbff && i + 1 < length) {
      const low = input.peek(i + 1)
      if (low >= 0xdc00 && low <= 0xdfff) {
        text += String.fromCharCode(charCode, low)
        i++ // Skip the low surrogate
        continue
      }
    }
    text += String.fromCharCode(charCode)
  }
  return text
}

// Consume word characters, tracking if it remains a valid identifier
// Returns the position after consuming, whether it's a valid identifier, and if we stopped at a dot
const consumeWordToken = (
  input: InputStream,
  isValidStart: boolean,
  canBeWord: boolean
): { pos: number; isValidIdentifier: boolean; stoppedAtDot: boolean } => {
  let pos = getCharSize(getFullCodePoint(input, 0))
  let isValidIdentifier = isValidStart
  let stoppedAtDot = false

  while (true) {
    const ch = getFullCodePoint(input, pos)

    // Stop at dot if we have a valid identifier (might be property access)
    if (ch === 46 /* . */ && isValidIdentifier) {
      stoppedAtDot = true
      break
    }

    // Stop if we hit a non-word character
    if (!isWordChar(ch)) break

    // Context-aware termination: semicolon/colon can end a word if followed by whitespace
    // This allows `hello; 2` to parse correctly while `hello;world` stays as one word
    if (canBeWord && (ch === 59 /* ; */ || ch === 58) /* : */) {
      const nextCh = getFullCodePoint(input, pos + 1)
      if (!isWordChar(nextCh)) break
    }

    // Track identifier validity: must be lowercase, digit, dash, or emoji
    if (!isLowercaseLetter(ch) && !isDigit(ch) && ch !== 45 /* - */ && !isEmoji(ch)) {
      if (!canBeWord) break
      isValidIdentifier = false
    }

    pos += getCharSize(ch)
  }

  return { pos, isValidIdentifier, stoppedAtDot }
}

// Consume the rest of a word after we've decided not to treat a dot as DotGet
// Used when we have "file.txt" - we already consumed "file", now consume ".txt"
const consumeRestOfWord = (input: InputStream, startPos: number, canBeWord: boolean): number => {
  let pos = startPos
  while (true) {
    const ch = getFullCodePoint(input, pos)

    // Stop if we hit a non-word character
    if (!isWordChar(ch)) break

    // Context-aware termination for semicolon/colon
    if (canBeWord && (ch === 59 /* ; */ || ch === 58) /* : */) {
      const nextCh = getFullCodePoint(input, pos + 1)
      if (!isWordChar(nextCh)) break
    }

    pos += getCharSize(ch)
  }
  return pos
}

// Check if this identifier is in scope (for property access detection)
// Returns IdentifierBeforeDot token if in scope, null otherwise
const checkForDotGet = (input: InputStream, stack: Stack, pos: number): number | null => {
  const identifierText = buildIdentifierText(input, pos)
  const scopeContext = stack.context as ScopeContext | undefined
  const scope = scopeContext?.scope

  // If identifier is in scope, this is property access (e.g., obj.prop)
  // If not in scope, it should be consumed as a Word (e.g., file.txt)
  return scope?.has(identifierText) ? IdentifierBeforeDot : null
}

// Decide between AssignableIdentifier and Identifier using grammar state + peek-ahead
const chooseIdentifierToken = (input: InputStream, stack: Stack): number => {
  const canAssignable = stack.canShift(AssignableIdentifier)
  const canRegular = stack.canShift(Identifier)

  // Only one option is valid - use it
  if (canAssignable && !canRegular) return AssignableIdentifier
  if (canRegular && !canAssignable) return Identifier

  // Both possible (ambiguous context) - peek ahead for '=' to disambiguate
  // This happens at statement start where both `x = 5` (assign) and `echo x` (call) are valid
  let peekPos = 0
  while (true) {
    const ch = getFullCodePoint(input, peekPos)
    if (isWhiteSpace(ch)) {
      peekPos += getCharSize(ch)
    } else {
      break
    }
  }

  const nextCh = getFullCodePoint(input, peekPos)
  return nextCh === 61 /* = */ ? AssignableIdentifier : Identifier
}

// Character classification helpers
const isWhiteSpace = (ch: number): boolean => {
  return ch === 32 /* space */ || ch === 9 /* tab */ || ch === 13 /* \r */
}

const isWordChar = (ch: number): boolean => {
  return !isWhiteSpace(ch) && ch !== 10 /* \n */ && ch !== 41 /* ) */ && ch !== -1 /* EOF */
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

  return ch
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
