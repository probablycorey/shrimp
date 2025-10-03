# Shrimp Parser - Development Context

## Overview

Building a command-line language parser using Lezer (CodeMirror's parser system) with TypeScript. The goal is to create a prototype that can parse commands with arguments, similar to shell syntax, with inline hints for autocompletion.

## Current Architecture

### Grammar Structure (`shrimp.grammar`)

- **Commands**: Can be complete (`Command`) or partial (`CommandPartial`) for autocomplete
- **Arguments**: Positional or named (with `name=value` syntax)
- **Key Challenge**: Handling arbitrary text (like file paths) as arguments without conflicting with operators/keywords

### Tokenizer Setup (`tokenizers.ts`)

- **Main tokenizer**: Returns `Command`, `CommandPartial`, or `Identifier` based on context
- **Command matching**: Uses `matchCommand()` to check against available commands
- **Context-aware**: Uses `stack.canShift()` to return appropriate token based on parse position
- **Issue**: Second occurrence of command name (e.g., `tail tail`) should be `Identifier` not `Command`

### Key Design Decisions

1. **External tokenizers over regular tokens** for commands to enable:

   - Dynamic command list (can change at runtime)
   - Partial matching for autocomplete
   - Context-aware tokenization

2. **Virtual semicolons** for statement boundaries:

   - Using `insertSemicolon` external tokenizer
   - Inserts at newlines/EOF to keep parser "inside" CommandCall
   - Prevents `tail t` from parsing as two separate commands

3. **UnquotedArg token** for paths/arbitrary text:
   - Accepts anything except whitespace/parens/equals
   - Only valid in command argument context
   - Avoids conflicts with operators elsewhere

### Current Problems

1. **Parser completes CommandCall too early**

   - After `tail `, cursor shows position in `Program` not `CommandCall`
   - Makes hint system harder to implement

2. **Command token in wrong context**

   - `tail tail` - second "tail" returns `Command` token but should be `Identifier`
   - Need better context checking in tokenizer

3. **Inline hints need to be smarter**
   - Must look backward to find command context
   - Handle cases where parser has "completed" the command

### Test Infrastructure

- Custom test matchers: `toMatchTree`, `toEvaluateTo`
- Command source injection for testing: `setCommandSource()`
- Tests in `shrimp.test.ts`

### File Structure

```
src/parser/
  shrimp.grammar     - Lezer grammar definition
  tokenizers.ts      - External tokenizers
  shrimp.ts         - Generated parser

src/editor/
  commands.ts        - Command definitions
  plugins/
    inlineHints.tsx  - Autocomplete hint UI
```

## Next Steps

1. Fix tokenizer context checking with `stack.canShift()`
2. Improve hint detection for "after command with space" case
3. Consider if grammar structure changes would help

## Key Concepts to Remember

- Lezer is LR parser - builds tree bottom-up
- External tokenizers run at each position
- `@skip { space }` makes whitespace invisible to parser
- Token precedence matters for overlap resolution
- `stack.canShift(tokenId)` checks if token is valid at current position
