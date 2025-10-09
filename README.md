# Shrimp Language

## Overview

Shrimp is a shell-like scripting language that combines the simplicity of command-line interfaces with functional programming concepts. Built using Lezer (CodeMirror's parser system) with TypeScript.

## Use it

Go to http://localhost:3000 to try out the playground.

    echo "Hello, world!"
    tail log.txt lines=50

    name = "Shrimp"
    greet = fn person: echo "Hello" person

    result = tail log.txt lines=10

## Language Design Philosophy

- **Shell-like command syntax** - `echo hello world` works naturally
- **Everything is an expression** - Commands, assignments, and functions all return values
- **Whitespace matters in binary operations** - Spaces distinguish operators from identifiers (e.g., `x-1` is an identifier, `x - 1` is subtraction)
- **Unbound symbols become strings** - `echo hello` treats `hello` as a string if not defined
- **Simplicity over cleverness** - Each feature should work one way, consistently. Two simple features that are easy to explain beat one complex feature that requires lots of explanation

### Parser Features

- ✅ Distinguishes identifiers from words to enable shell-like syntax - paths like `./file.txt` work without quotes
- ✅ Smart tokenization for named args (`lines=30` splits, but `./path=value` stays together)
- ✅ Handles ambiguous cases (bare identifier could be function call or variable reference)

## Architecture

**parser/** - Lezer grammar and tokenizers that parse Shrimp code into syntax trees
**editor/** - CodeMirror integration with syntax highlighting and language support  
**compiler/** - Transforms syntax trees into ReefVM bytecode for execution

The flow: Shrimp source → parser (CST) → compiler (bytecode) → ReefVM (execution)

See `example.shrimp` for language examples and `src/parser/shrimp.grammar` for the full grammar.
