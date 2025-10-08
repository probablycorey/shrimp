# Shrimp Language

## Overview

Shrimp is a shell-like scripting language that combines the simplicity of command-line interfaces with functional programming concepts. Built using Lezer (CodeMirror's parser system) with TypeScript.

## Language Design Philosophy

- **Everything is an expression** - Commands, assignments, and functions all return values
- **Whitespace matters** - Spaces distinguish operators from identifiers (e.g., `x-1` is an identifier, `x - 1` is subtraction)
- **Shell-like command syntax** - `echo hello world` works naturally
- **Named arguments without quotes** - `tail file.txt lines=30`
- **Unbound symbols become strings** - `echo hello` treats `hello` as a string if not defined
- **Simplicity over cleverness** - Each feature should work one way, consistently. Two simple features that are easy to explain beat one complex feature that requires lots of explanation

### Parser Features

- ✅ Distinguishes between identifiers (assignable) and words e(non-assignable)
- ✅ Smart tokenization for named args (`lines=30` splits, but `./path=value` stays together)
- ✅ Handles ambiguous cases (bare identifier could be function call or variable reference)

## Grammar Architecture

See `src/parser/example.shrimp` for language examples and `src/parser/shrimp.grammar` for the full grammar.

### Key Token Types

- **Identifier** - Lowercase/emoji start, can contain dashes/numbers (assignable)
- **Word** - Any non-whitespace that isn't a valid identifier (paths, URLs, etc.)
- **FunctionCall** - Identifier followed by arguments
- **FunctionCallOrIdentifier** - Ambiguous case resolved at runtime
