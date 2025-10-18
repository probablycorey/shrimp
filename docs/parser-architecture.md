# Shrimp Parser Architecture

This document explains the special cases, tricks, and design decisions in the Shrimp parser and tokenizer.

## Table of Contents

1. [Token Types and Their Purpose](#token-types-and-their-purpose)
2. [External Tokenizer Tricks](#external-tokenizer-tricks)
3. [Grammar Special Cases](#grammar-special-cases)
4. [Scope Tracking Architecture](#scope-tracking-architecture)
5. [Common Pitfalls](#common-pitfalls)

---

## Token Types and Their Purpose

### Four Token Types from External Tokenizer

The external tokenizer (`src/parser/tokenizer.ts`) emits four different token types based on context:

| Token | Purpose | Example |
|-------|---------|---------|
| `Identifier` | Regular identifiers in expressions, function calls | `echo`, `x` in `x + 1` |
| `AssignableIdentifier` | Identifiers on LHS of `=` or in function params | `x` in `x = 5`, params in `fn x y:` |
| `Word` | Anything else: paths, URLs, @mentions, #hashtags | `./file.txt`, `@user`, `#tag` |
| `IdentifierBeforeDot` | Identifier that's in scope, followed by `.` | `obj` in `obj.prop` |

### Why We Need Both Identifier Types

**The Problem:** At the start of a statement like `x ...`, the parser doesn't know if it's:
- An assignment: `x = 5` (needs `AssignableIdentifier`)
- A function call: `x hello world` (needs `Identifier`)

**The Solution:** The external tokenizer uses a three-way decision:

1. **Only `AssignableIdentifier` can shift** (e.g., in `Params` rule) → emit `AssignableIdentifier`
2. **Only `Identifier` can shift** (e.g., in function arguments) → emit `Identifier`
3. **Both can shift** (ambiguous statement start) → peek ahead for `=` to disambiguate

See [`Identifier vs AssignableIdentifier Disambiguation`](#identifier-vs-assignableidentifier-disambiguation) below for implementation details.

---

## External Tokenizer Tricks

### 1. Identifier vs AssignableIdentifier Disambiguation

**Location:** `src/parser/tokenizer.ts` lines 88-118

**The Challenge:** When both `Identifier` and `AssignableIdentifier` are valid (at statement start), how do we choose?

**The Solution:** Three-way branching with lookahead:

```typescript
const canAssignable = stack.canShift(AssignableIdentifier)
const canRegular = stack.canShift(Identifier)

if (canAssignable && !canRegular) {
  // Only AssignableIdentifier valid (e.g., in Params)
  input.acceptToken(AssignableIdentifier)
} else if (canRegular && !canAssignable) {
  // Only Identifier valid (e.g., in function args)
  input.acceptToken(Identifier)
} else {
  // BOTH possible - peek ahead for '='
  // Skip whitespace, check if next char is '='
  const nextCh = getFullCodePoint(input, peekPos)
  if (nextCh === 61 /* = */) {
    input.acceptToken(AssignableIdentifier)  // It's an assignment
  } else {
    input.acceptToken(Identifier)  // It's a function call
  }
}
```

**Key Insight:** `stack.canShift()` returns true for BOTH token types when the grammar has multiple valid paths. We can't just use `canShift()` alone - we need lookahead.

**Why This Works:**
- `fn x y: ...` → In `Params` rule, only `AssignableIdentifier` can shift → no lookahead needed
- `echo hello` → Both can shift, but no `=` ahead → emits `Identifier` → parses as `FunctionCall`
- `x = 5` → Both can shift, finds `=` ahead → emits `AssignableIdentifier` → parses as `Assign`

### 2. Surrogate Pair Handling for Emoji

**Location:** `src/parser/tokenizer.ts` lines 71-84, `getFullCodePoint()` function

**The Problem:** JavaScript strings use UTF-16, but emoji like 🍤 use code points outside the BMP (Basic Multilingual Plane), requiring surrogate pairs.

**The Solution:** When reading characters, check for high surrogates (0xD800-0xDBFF) and combine them with low surrogates (0xDC00-0xDFFF):

```typescript
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
```

**Why This Matters:** Without this, `shrimp-🍤` would be treated as `shrimp-<high><low>` (4 characters) instead of `shrimp-🍤` (2 characters).

### 3. Context-Aware Termination for Semicolon and Colon

**Location:** `src/parser/tokenizer.ts` lines 51-57

**The Problem:** How do we parse `basename ./cool;` vs `basename ./cool; 2`?

**The Solution:** Only treat `;` and `:` as terminators if they're followed by whitespace (or EOF):

```typescript
if (canBeWord && (ch === 59 /* ; */ || ch === 58) /* : */) {
  const nextCh = getFullCodePoint(input, pos + 1)
  if (!isWordChar(nextCh)) break  // It's a terminator
  // Otherwise, continue consuming as part of the Word
}
```

**Examples:**
- `basename ./cool;` → `;` is followed by EOF → terminates the word at `./cool`
- `basename ./cool;2` → `;` is followed by `2` → included in word as `./cool;2`
- `basename ./cool; 2` → `;` is followed by space → terminates at `./cool`, `2` is next arg

### 4. Scope-Aware Property Access (DotGet)

**Location:** `src/parser/tokenizer.ts` lines 19-48

**The Problem:** How do we distinguish `obj.prop` (property access) from `readme.txt` (filename)?

**The Solution:** When we see a `.` after an identifier, check if that identifier is in scope:

```typescript
if (ch === 46 /* . */ && isValidIdentifier) {
  // Build identifier text
  let identifierText = '...'  // (surrogate-pair aware)

  const scopeContext = stack.context as ScopeContext | undefined
  const scope = scopeContext?.scope

  if (scope?.has(identifierText)) {
    // In scope - stop here, emit IdentifierBeforeDot
    // Grammar will parse as DotGet
    input.acceptToken(IdentifierBeforeDot)
    return
  }
  // Not in scope - continue consuming as Word
  // Will parse as Word("readme.txt")
}
```

**Examples:**
- `config = {path: "..."}; config.path` → `config` is in scope → parses as `DotGet(IdentifierBeforeDot, Identifier)`
- `cat readme.txt` → `readme` is not in scope → parses as `Word("readme.txt")`

---

## Grammar Special Cases

### 1. expressionWithoutIdentifier Pattern

**Location:** `src/parser/shrimp.grammar` lines 200-210

**The Problem:** GLR conflict in `consumeToTerminator` rule:

```lezer
consumeToTerminator {
  ambiguousFunctionCall |  // → FunctionCallOrIdentifier → Identifier
  expression              // → Identifier
}
```

When parsing `my-var` at statement level, both paths want the same `Identifier` token, causing a conflict.

**The Solution:** Remove `Identifier` from the `expression` path by creating `expressionWithoutIdentifier`:

```lezer
expression {
  expressionWithoutIdentifier | DotGet | Identifier
}

expressionWithoutIdentifier {
  ParenExpr | Word | String | Number | Boolean | Regex | Null
}
```

Then use `expressionWithoutIdentifier` in places where we don't want bare identifiers:

```lezer
consumeToTerminator {
  PipeExpr |
  ambiguousFunctionCall |   // ← Handles standalone identifiers
  DotGet |
  IfExpr |
  FunctionDef |
  Assign |
  BinOp |
  expressionWithoutIdentifier  // ← No bare Identifier here
}
```

**Why This Works:** Now standalone identifiers MUST go through `ambiguousFunctionCall`, which is semantically what we want (they're either function calls or variable references).

### 2. @skip {} Wrapper for DotGet

**Location:** `src/parser/shrimp.grammar` lines 176-183

**The Problem:** DotGet needs to be whitespace-sensitive (no spaces allowed around `.`), but the global `@skip { space }` would remove them.

**The Solution:** Use `@skip {}` (empty skip) wrapper to disable automatic whitespace skipping:

```lezer
@skip {} {
  DotGet {
    IdentifierBeforeDot "." Identifier
  }

  String { "'" stringContent* "'" }
}
```

**Why This Matters:**
- `obj.prop` → Parses as `DotGet` ✓
- `obj. prop` → Would parse as `obj` followed by `. prop` (error) if whitespace was skipped
- `obj .prop` → Would parse as `obj` followed by `.prop` (error) if whitespace was skipped

### 3. EOF Handling in item Rule

**Location:** `src/parser/shrimp.grammar` lines 54-58

**The Problem:** How do we handle empty lines and end-of-file without infinite loops?

**The Solution:** Use alternatives instead of repetition for EOF:

```lezer
item {
  consumeToTerminator newlineOrSemicolon |  // Statement with newline/semicolon
  consumeToTerminator eof |                 // Statement at end of file
  newlineOrSemicolon                        // Allow blank lines
}
```

**Why Not Just `item { (statement | newlineOrSemicolon)+ eof? }`?**

That would match EOF multiple times (once after each statement), causing parser errors. By making EOF part of an alternative, it's only matched once per item.

### 4. Params Uses AssignableIdentifier

**Location:** `src/parser/shrimp.grammar` lines 153-155

```lezer
Params {
  AssignableIdentifier*
}
```

**Why This Matters:** Function parameters are in "assignable" positions - they're being bound to values when the function is called. Using `AssignableIdentifier` here:
1. Makes the grammar explicit about which identifiers create bindings
2. Enables the tokenizer to use `canShift(AssignableIdentifier)` to detect param context
3. Allows the scope tracker to only capture `AssignableIdentifier` tokens

### 5. String Interpolation Inside @skip {}

**Location:** `src/parser/shrimp.grammar` lines 181-198

**The Problem:** String contents need to preserve whitespace, but string interpolation `$identifier` needs to use the external tokenizer.

**The Solution:** Put `String` inside `@skip {}` and use the external tokenizer for `Identifier` within interpolation:

```lezer
@skip {} {
  String { "'" stringContent* "'" }
}

stringContent {
  StringFragment |      // Matches literal text (preserves spaces)
  Interpolation |       // $identifier or $(expr)
  EscapeSeq            // \$, \n, etc.
}

Interpolation {
  "$" Identifier |      // Uses external tokenizer!
  "$" ParenExpr
}
```

**Key Insight:** External tokenizers work inside `@skip {}` blocks! The tokenizer gets called even when skip is disabled.

---

## Scope Tracking Architecture

### Overview

Scope tracking uses Lezer's `@context` feature to maintain a scope chain during parsing. This enables:
- Distinguishing `obj.prop` (property access) from `readme.txt` (filename)
- Tracking which variables are in scope for each position in the parse tree

### Architecture: Scope vs ScopeContext

**Two-Class Design:**

```typescript
// Pure, hashable scope - only variable tracking
class Scope {
  constructor(
    public parent: Scope | null,
    public vars: Set<string>
  ) {}

  has(name: string): boolean
  add(...names: string[]): Scope
  push(): Scope  // Create child scope
  pop(): Scope   // Return to parent
  hash(): number // For incremental parsing
}

// Wrapper with temporary state
export class ScopeContext {
  constructor(
    public scope: Scope,
    public pendingIds: string[] = []
  ) {}
}
```

**Why This Separation?**

1. **Scope is pure and hashable** - Only contains committed variable bindings, no temporary state
2. **ScopeContext holds temporary state** - The `pendingIds` array captures identifiers during parsing but isn't part of the hash
3. **Hash function only hashes Scope** - Incremental parsing only cares about actual scope, not pending identifiers

### How Scope Tracking Works

**1. Capture Phase (shift):**

When the parser shifts an `AssignableIdentifier` token, the scope tracker captures its text:

```typescript
shift(context, term, stack, input) {
  if (term === terms.AssignableIdentifier) {
    // Build text by peeking at input
    let text = '...'  // (read from input.pos to stack.pos)

    return new ScopeContext(
      context.scope,
      [...context.pendingIds, text]  // Append to pending
    )
  }
  return context
}
```

**2. Commit Phase (reduce):**

When the parser reduces to `Assign` or `Params`, the scope tracker commits pending identifiers:

```typescript
reduce(context, term, stack, input) {
  // Assignment: pop last identifier, add to scope
  if (term === terms.Assign && context.pendingIds.length > 0) {
    const varName = context.pendingIds[context.pendingIds.length - 1]!
    return new ScopeContext(
      context.scope.add(varName),      // Add to scope
      context.pendingIds.slice(0, -1)  // Remove from pending
    )
  }

  // Function params: add all identifiers, push new scope
  if (term === terms.Params) {
    const newScope = context.scope.push()
    return new ScopeContext(
      context.pendingIds.length > 0
        ? newScope.add(...context.pendingIds)
        : newScope,
      []  // Clear pending
    )
  }

  // Function exit: pop scope
  if (term === terms.FunctionDef) {
    return new ScopeContext(context.scope.pop(), [])
  }

  return context
}
```

**3. Usage in Tokenizer:**

The tokenizer accesses scope to check if identifiers are bound:

```typescript
const scopeContext = stack.context as ScopeContext | undefined
const scope = scopeContext?.scope

if (scope?.has(identifierText)) {
  // Identifier is in scope - can use in DotGet
  input.acceptToken(IdentifierBeforeDot)
}
```

### Why Only Track AssignableIdentifier?

**Before (complex):**
- Tracked ALL identifiers with `term === terms.Identifier`
- Used `isInParams` flag to know which ones to keep
- Had to manually clear "stale" identifiers after DotGet, FunctionCall, etc.

**After (simple):**
- Only track `AssignableIdentifier` tokens
- These only appear in `Params` and `Assign` (by grammar design)
- No stale identifiers - they're consumed immediately

**Example:**

```shrimp
fn x y: echo x end
```

Scope tracking:
1. Shift `AssignableIdentifier("x")` → pending = ["x"]
2. Shift `AssignableIdentifier("y")` → pending = ["x", "y"]
3. Reduce `Params` → scope = {x, y}, pending = []
4. Shift `Identifier("echo")` → **not captured** (not AssignableIdentifier)
5. Shift `Identifier("x")` → **not captured**
6. Reduce `FunctionDef` → pop scope

No stale identifier clearing needed!

---

## Common Pitfalls

### 1. Forgetting Surrogate Pairs

**Problem:** Using `input.peek(i)` directly gives UTF-16 code units, not Unicode code points.

**Solution:** Always use `getFullCodePoint(input, pos)` when working with emoji.

**Example:**
```typescript
// ❌ Wrong - breaks on emoji
const ch = input.peek(pos)
if (isEmoji(ch)) { ... }

// ✓ Right - handles surrogate pairs
const ch = getFullCodePoint(input, pos)
if (isEmoji(ch)) { ... }
pos += getCharSize(ch)  // Advance by 1 or 2 code units
```

### 2. Adding Pending State to Hash

**Problem:** Including `pendingIds` or `isInParams` in the hash function breaks incremental parsing.

**Why?** The hash is used to determine if a cached parse tree node can be reused. If the hash includes temporary state that doesn't affect parsing decisions, nodes will be invalidated unnecessarily.

**Solution:** Only hash the `Scope` (vars + parent chain), not the `ScopeContext` wrapper.

```typescript
// ✓ Right
const hashScope = (context: ScopeContext): number => {
  return context.scope.hash()  // Only hash committed scope
}

// ❌ Wrong
const hashScope = (context: ScopeContext): number => {
  let h = context.scope.hash()
  h = (h << 5) - h + context.pendingIds.length  // Don't do this!
  return h
}
```

### 3. Using canShift() Alone for Disambiguation

**Problem:** `stack.canShift(AssignableIdentifier)` returns true when BOTH paths are possible (e.g., at statement start).

**Why?** The GLR parser maintains multiple parse states. If any state can shift the token, `canShift()` returns true.

**Solution:** Check BOTH token types and use lookahead when both are possible:

```typescript
const canAssignable = stack.canShift(AssignableIdentifier)
const canRegular = stack.canShift(Identifier)

if (canAssignable && canRegular) {
  // Both possible - need lookahead
  const hasEquals = peekForEquals(input, pos)
  input.acceptToken(hasEquals ? AssignableIdentifier : Identifier)
}
```

### 4. Clearing Pending Identifiers Too Eagerly

**Problem:** In the old code, we had to clear pending identifiers after DotGet, FunctionCall, etc. to prevent state leakage. This was fragile and easy to forget.

**Why This Happened:** We were tracking ALL identifiers, not just assignable ones.

**Solution:** Only track `AssignableIdentifier` tokens. They only appear in contexts where they'll be consumed (Params, Assign), so no clearing needed.

### 5. Line Number Confusion in Edit Tool

**Problem:** The Edit tool shows line numbers with a prefix (like `     5→`), but these aren't the real line numbers.

**How to Read:**
- The number before `→` is the actual line number
- Use that number when referencing code in comments or documentation
- Example: `     5→export const foo` means the code is on line 5

---

## Testing Strategy

### Parser Tests

Use the `toMatchTree` helper to verify parse tree structure:

```typescript
test('assignment with AssignableIdentifier', () => {
  expect('x = 5').toMatchTree(`
    Assign
      AssignableIdentifier x
      operator =
      Number 5
  `)
})
```

**Key Testing Patterns:**
- Test both token type expectations (Identifier vs AssignableIdentifier)
- Test scope-aware features (DotGet for in-scope vs Word for out-of-scope)
- Test edge cases (empty lines, EOF, surrogate pairs)

### Debugging Parser Issues

1. **Check token types:** Run parser on input and examine tree structure
2. **Test canShift():** Add logging to tokenizer to see what `canShift()` returns
3. **Verify scope state:** Log scope contents during parsing
4. **Use GLR visualization:** Lezer has tools for visualizing parse states

---

## Further Reading

- [Lezer System Guide](https://lezer.codemirror.net/docs/guide/)
- [Lezer API Reference](https://lezer.codemirror.net/docs/ref/)
- [CLAUDE.md](../CLAUDE.md) - General project guidance
- [Scope Tracker Source](../src/parser/scopeTracker.ts)
- [Tokenizer Source](../src/parser/tokenizer.ts)
