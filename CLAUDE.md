# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with the Shrimp programming language.

## Pair Programming Approach

Act as a pair programming partner and teacher, not an autonomous code writer:

**Research and guide, don't implement**:

- Focus on research, analysis, and finding solutions
- Explain concepts, trade-offs, and best practices
- Guide the human through changes rather than making them directly
- Help them learn the codebase deeply by maintaining ownership

**Use tmp/ directory for experimentation**:

- Create temporary files in `tmp/` to test ideas out experiments you want to run.
- Example: `tmp/eof-test.grammar`, `tmp/pattern-experiments.ts`
- Clean up tmp files when done
- Show multiple approaches so the human can choose

**Teaching moments**:

- Explain the "why" behind solutions
- Point out potential pitfalls and edge cases
- Share relevant documentation and examples
- Help build understanding, not just solve problems

## Project Overview

Shrimp is a shell-like scripting language that combines command-line simplicity with functional programming. The architecture flows: Shrimp source → parser (CST) → compiler (bytecode) → ReefVM (execution).

**Essential reading**: Before making changes, read README.md to understand the language design philosophy and parser architecture.

Key references: [Lezer System Guide](https://lezer.codemirror.net/docs/guide/) | [Lezer API](https://lezer.codemirror.net/docs/ref/)

## Reading the Codebase: What to Look For

When exploring Shrimp, focus on these key files in order:

1. **src/parser/shrimp.grammar** - Language syntax rules

   - Note the `expressionWithoutIdentifier` pattern and its comment
   - See how `consumeToTerminator` handles statement-level parsing

2. **src/parser/tokenizer.ts** - How Identifier vs Word is determined

   - Check the emoji Unicode ranges and surrogate pair handling
   - See context-aware termination logic (`;`, `)`, `:`)

3. **src/compiler/compiler.ts** - CST to bytecode transformation

   - See how functions become labels in `fnLabels` map
   - Check short-circuit logic for `and`/`or` (lines 267-282)
   - Notice `TRY_CALL` emission for bare identifiers (line 152)

4. **packages/ReefVM/src/vm.ts** - Bytecode execution
   - See `TRY_CALL` fall-through to `CALL` (lines 357-375)
   - Check `TRY_LOAD` string coercion (lines 135-145)
   - Notice NOSE-style named parameter binding (lines 425-443)

## Development Commands

### Running Files

```bash
bun <file>                  # Run TypeScript files directly
bun src/server/server.tsx   # Start development server
bun dev                     # Start development server (alias)
```

### Testing

```bash
bun test                           # Run all tests
bun test src/parser/parser.test.ts # Run parser tests specifically
bun test --watch                   # Watch mode
```

### Parser Development

```bash
bun generate-parser              # Regenerate parser from grammar
bun test src/parser/parser.test.ts  # Test grammar changes
```

### Server

```bash
bun dev                    # Start playground at http://localhost:3000
```

### Building

No build step required - Bun runs TypeScript directly. Parser auto-regenerates during tests.

## Code Style Preferences

**Early returns over deep nesting**:

```typescript
// ✅ Good
const processToken = (token: Token) => {
  if (!token) return null
  if (token.type !== 'identifier') return null

  return processIdentifier(token)
}

// ❌ Avoid
const processToken = (token: Token) => {
  if (token) {
    if (token.type === 'identifier') {
      return processIdentifier(token)
    }
  }
  return null
}
```

**Arrow functions over function keyword**:

```typescript
// ✅ Good
const parseExpression = (input: string) => {
  // implementation
}

// ❌ Avoid
function parseExpression(input: string) {
  // implementation
}
```

**Code readability over cleverness**:

- Use descriptive variable names
- Write code that explains itself
- Prefer explicit over implicit
- Two simple functions beat one complex function

## Architecture

### Core Components

**parser/** (Lezer-based parsing):

- **shrimp.grammar**: Lezer grammar definition with tokens and rules
- **shrimp.ts**: Auto-generated parser (don't edit directly)
- **tokenizer.ts**: Custom tokenizer for identifier vs word distinction
- **parser.test.ts**: Comprehensive grammar tests using `toMatchTree`

**editor/** (CodeMirror integration):

- Syntax highlighting for Shrimp language
- Language support and autocomplete
- Integration with the parser for real-time feedback

**compiler/** (CST to bytecode):

- Transforms concrete syntax trees into ReefVM bytecode
- Handles function definitions, expressions, and control flow

### Critical Design Decisions

**Whitespace-sensitive parsing**: Spaces distinguish operators from identifiers (`x-1` vs `x - 1`). This enables natural shell-like syntax.

**Identifier vs Word tokenization**: The custom tokenizer (tokenizer.ts) is sophisticated:

- **Surrogate pair handling**: Processes emoji as full Unicode code points (lines 51-65)
- **Context-aware termination**: Stops at `;`, `)`, `:` only when followed by whitespace (lines 19-24)
  - This allows `basename ./cool;` to parse correctly
  - But `basename ./cool; 2` treats the semicolon as a terminator
- **GLR state checking**: Uses `stack.canShift(Word)` to decide whether to track identifier validity
- **Permissive Words**: Anything that's not an identifier is a Word (paths, URLs, @mentions, #hashtags)

**Why this matters**: This complexity is what enables shell-like syntax. Without it, you'd need quotes around `./file.txt` or special handling for paths.

**Identifier rules**: Must start with lowercase letter or emoji, can contain lowercase, digits, dashes, and emoji.

**Word rules**: Everything else that isn't whitespace or a delimiter.

**Ambiguous identifier resolution**: Bare identifiers like `myVar` could be function calls or variable references. The parser creates `FunctionCallOrIdentifier` nodes, resolved at runtime using the `TRY_CALL` opcode.

**How it works**:

- The compiler emits `TRY_CALL varname` for bare identifiers (src/compiler/compiler.ts:152)
- ReefVM checks if the variable is a function at runtime (vm.ts:357-373)
- If it's a function, TRY_CALL intentionally falls through to CALL opcode (no break statement)
- If it's not a function or undefined, it pushes the value/string and returns
- This runtime resolution enables shell-like "echo hello" without quotes

**Unbound symbols become strings**: When `TRY_LOAD` encounters an undefined variable, it pushes the variable name as a string (vm.ts:135-145). This is a first-class language feature implemented as a VM opcode, not a parser trick.

**Expression-oriented design**: Everything returns a value - commands, assignments, functions. This enables composition and functional patterns.

**EOF handling**: The grammar uses `(statement | newlineOrSemicolon)+ eof?` to handle empty lines and end-of-file without infinite loops.

## Compiler Architecture

**Function compilation strategy**: The compiler doesn't create inline function objects. Instead it:

1. Generates unique labels (`.func_0`, `.func_1`) for each function body (compiler.ts:137)
2. Stores function body instructions in `fnLabels` map during compilation
3. Appends all function bodies to the end of bytecode with RETURN instructions (compiler.ts:36-41)
4. Emits `MAKE_FUNCTION` with parameters and label reference

This approach keeps the main program linear and allows ReefVM to jump to function bodies by label.

**Short-circuit logic**: ReefVM has no AND/OR opcodes. The compiler implements short-circuit evaluation using:

```typescript
// For `a and b`:
LOAD a
DUP                    // Duplicate so we can return it if falsy
JUMP_IF_FALSE skip     // If false, skip evaluating b
POP                    // Remove duplicate if we're continuing
LOAD b                 // Evaluate right side
skip:
```

See compiler.ts:267-282 for the full implementation. The `or` operator uses `JUMP_IF_TRUE` instead.

**If/else compilation**: The compiler uses label-based jumps:

- `JUMP_IF_FALSE` skips the then-block when condition is false
- Each branch ends with `JUMP endLabel` to skip remaining branches
- The final label marks where all branches converge
- If there's no else branch, compiler emits `PUSH null` as the default value

## Grammar Development

### Grammar Structure

The grammar follows this hierarchy:

```
Program → statement*
statement → line newlineOrSemicolon | line eof
line → FunctionCall | FunctionCallOrIdentifier | FunctionDef | Assign | expression
```

Key tokens:

- `newlineOrSemicolon`: `"\n" | ";"`
- `eof`: `@eof`
- `Identifier`: Lowercase/emoji start, assignable variables
- `Word`: Everything else (paths, URLs, etc.)

### Adding Grammar Rules

When modifying the grammar:

1. **Update `src/parser/shrimp.grammar`** with your changes
2. **Run tests** - the parser auto-regenerates during test runs
3. **Add test cases** in `src/parser/parser.test.ts` using `toMatchTree`
4. **Test empty line handling** - ensure EOF works properly

### Test Format

Grammar tests use this pattern:

```typescript
test('function call with args', () => {
  expect('echo hello world').toMatchTree(`
    FunctionCall
      Identifier echo
      PositionalArg
        Word hello
      PositionalArg  
        Word world
  `)
})
```

The `toMatchTree` helper compares parser output with expected CST structure.

### Common Grammar Gotchas

**EOF infinite loops**: Using `@eof` in repeating patterns can match EOF multiple times. Current approach uses explicit statement/newline alternatives.

**Token precedence**: Use `@precedence` to resolve conflicts between similar tokens.

**External tokenizers**: Custom logic in `tokenizers.ts` handles complex cases like identifier vs word distinction.

**Empty line parsing**: The grammar structure `(statement | newlineOrSemicolon)+ eof?` allows proper empty line and EOF handling.

## Lezer: Surprising Behaviors

These discoveries came from implementing string interpolation with external tokenizers. See `tmp/string-test4.grammar` for working examples.

### 1. Rule Capitalization Controls Tree Structure

**The most surprising discovery**: Rule names determine whether nodes appear in the parse tree.

**Lowercase rules get inlined** (no tree nodes):
```lezer
statement { assign | expr }  // ❌ No "statement" node
assign { x "=" y }            // ❌ No "assign" node
expr { x | y }                // ❌ No "expr" node
```

**Capitalized rules create tree nodes**:
```lezer
Statement { Assign | Expr }  // ✅ Creates Statement node
Assign { x "=" y }           // ✅ Creates Assign node
Expr { x | y }               // ✅ Creates Expr node
```

**Why this matters**: When debugging grammar that "doesn't match," check capitalization first. The rules might be matching perfectly—they're just being compiled away!

Example: `x = 42` was parsing as `Program(Identifier,"=",Number)` instead of `Program(Statement(Assign(...)))`. The grammar rules existed and were matching, but they were inlined because they were lowercase.

### 2. @skip {} Wrapper is Essential for Preserving Whitespace

**Initial assumption (wrong)**: Could exclude whitespace from token patterns to avoid needing `@skip {}`.

**Reality**: The `@skip {}` wrapper is absolutely required to preserve whitespace in strings:

```lezer
@skip {} {
  String { "'" StringContent* "'" }
}

@tokens {
  StringFragment { !['\\$]+ }  // Matches everything including spaces
}
```

**Without the wrapper**: All spaces get stripped by the global `@skip { space }`, even though `StringFragment` can match them.

**Test that proved it wrong**: `'  spaces  '` was being parsed as `"spaces"` (leading/trailing spaces removed) until we added `@skip {}`.

### 3. External Tokenizers Work Inside @skip {} Blocks

**Initial assumption (wrong)**: External tokenizers can't be used inside `@skip {}` blocks, so identifier patterns need to be duplicated as simple tokens.

**Reality**: External tokenizers work perfectly inside `@skip {}` blocks! The tokenizer gets called even when skip is disabled.

**Working pattern**:
```lezer
@external tokens tokenizer from "./tokenizer" { Identifier, Word }

@skip {} {
  String { "'" StringContent* "'" }
}

Interpolation {
  "$" Identifier |           // ← Uses external tokenizer!
  "$" "(" expr ")"
}
```

**Test that proved it**: `'hello $name'` correctly calls the external tokenizer for `name` inside the string, creating an `Identifier` token. No duplication needed!

### 4. Single-Character Tokens Can Be Literals

**Initial approach**: Define every single character as a token:
```lezer
@tokens {
  dollar[@name="$"] { "$" }
  backslash[@name="\\"] { "\\" }
}
```

**Simpler approach**: Just use literals in the grammar rules:
```lezer
Interpolation {
  "$" Identifier |           // Literal "$"
  "$" "(" expr ")"
}

StringEscape {
  "\\" ("$" | "n" | ...)     // Literal "\\"
}
```

This works fine and reduces boilerplate in the @tokens section.

### 5. StringFragment as Simple Token, Not External

For string content, use a simple token pattern instead of handling it in the external tokenizer:

```lezer
@tokens {
  StringFragment { !['\\$]+ }  // Simple pattern: not quote, backslash, or dollar
}
```

The external tokenizer should focus on Identifier/Word distinction at the top level. String content is simpler and doesn't need the complexity of the external tokenizer.

### Why expressionWithoutIdentifier Exists

The grammar has an unusual pattern: `expressionWithoutIdentifier`. This exists to solve a GLR conflict:

```
consumeToTerminator {
  ambiguousFunctionCall |   // → FunctionCallOrIdentifier → Identifier
  expression                 // → Identifier
}
```

Without `expressionWithoutIdentifier`, parsing `my-var` at statement level creates two paths that both want the Identifier token. The grammar comment (shrimp.grammar lines 157-164) explains we "gave up trying to use GLR to fix it."

**The solution**: Remove Identifier from the `expression` path by creating `expressionWithoutIdentifier`, forcing standalone identifiers through `ambiguousFunctionCall`. This is pragmatic over theoretical purity.

## Testing Strategy

### Parser Tests (`src/parser/parser.test.ts`)

- **Token types**: Identifier vs Word distinction
- **Function calls**: With and without arguments
- **Expressions**: Binary operations, parentheses, precedence
- **Functions**: Single-line and multiline definitions
- **Whitespace**: Empty lines, mixed delimiters
- **Edge cases**: Ambiguous parsing, incomplete input

Test structure:

```typescript
describe('feature area', () => {
  test('specific case', () => {
    expect(input).toMatchTree(expectedCST)
  })
})
```

When adding language features:

1. Write grammar tests first showing expected CST structure
2. Update grammar rules to make tests pass
3. Add integration tests showing real usage
4. Test edge cases and error conditions

## Bun Usage

Default to Bun over Node.js/npm:

- Use `bun <file>` instead of `node <file>` or `ts-node <file>`
- Use `bun test` instead of `jest` or `vitest`
- Use `bun install` instead of `npm install`
- Use `bun run <script>` instead of `npm run <script>`
- Bun automatically loads .env, so don't use dotenv

### Bun APIs

- Prefer `Bun.file` over `node:fs`'s readFile/writeFile
- Use `Bun.$` for shell commands instead of execa

## Common Patterns

### Grammar Debugging

When grammar isn't parsing correctly:

1. **Check token precedence** - ensure tokens are recognized correctly
2. **Test simpler cases first** - build up from basic to complex
3. **Use `toMatchTree` output** - see what the parser actually produces
4. **Check external tokenizer** - identifier vs word logic in `tokenizers.ts`

## Common Misconceptions

**"The parser handles unbound symbols as strings"** → False. The _VM_ does this via `TRY_LOAD` opcode. The parser creates `FunctionCallOrIdentifier` nodes; the compiler emits `TRY_LOAD`/`TRY_CALL`; the VM resolves at runtime.

**"Words are just paths"** → False. Words are _anything_ that isn't an identifier. Paths, URLs, `@mentions`, `#hashtags` all parse as Words. The tokenizer accepts any non-whitespace that doesn't match identifier rules.

**"Functions are first-class values"** → True, but they're compiled to labels, not inline bytecode. The VM creates closures with label references, not embedded instructions.

**"The grammar is simple"** → False. It has pragmatic workarounds for GLR conflicts (`expressionWithoutIdentifier`), complex EOF handling, and relies heavily on the external tokenizer for correctness.

**"Short-circuit logic is a VM feature"** → False. It's a compiler pattern using `DUP`, `JUMP_IF_FALSE/TRUE`, and `POP`. The VM has no AND/OR opcodes.
