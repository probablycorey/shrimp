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

**Identifier vs Word tokenization**: Custom tokenizer determines if a token is an assignable identifier (lowercase/emoji start) or a non-assignable word (paths, URLs). This allows `./file.txt` without quotes.

**Ambiguous identifier resolution**: Bare identifiers like `myVar` could be function calls or variable references. The parser creates `FunctionCallOrIdentifier` nodes, resolved at runtime.

**Expression-oriented design**: Everything returns a value - commands, assignments, functions. This enables composition and functional patterns.

**EOF handling**: The grammar uses `(statement | newlineOrSemicolon)+ eof?` to handle empty lines and end-of-file without infinite loops.

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
