# 🌟 Modern Language Inspiration & Implementation Plan

## Language Research Summary

### Pipe Operators Across Languages

| Language | Syntax | Placeholder | Notes |
|----------|--------|-------------|-------|
| **Gleam** | `\|>` | `_` | Placeholder can go anywhere, enables function capture |
| **Elixir** | `\|>` | `&1`, `&2` | Always first arg by default, numbered placeholders |
| **Nushell** | `\|` | structured data | Pipes structured data, not just text |
| **F#** | `\|>` | none | Always first argument |
| **Raku** | `==>` | `*` | Star placeholder for positioning |

### Conditional Syntax

| Language | Single-line | Multi-line | Returns Value |
|----------|------------|------------|---------------|
| **Lua** | `if x then y end` | `if..elseif..else..end` | No (statement) |
| **Luau** | `if x then y else z` | Same | Yes (expression) |
| **Ruby** | `x = y if condition` | `if..elsif..else..end` | Yes |
| **Python** | `y if x else z` | `if..elif..else:` | Yes |
| **Gleam** | N/A | `case` expressions | Yes |

## 🍤 Shrimp Design Decisions

### Pipe Operator with Placeholder (`|`)

**Syntax Choice: `|` with `_` placeholder**

```shrimp
# Basic pipe with placeholder
"hello world" | upcase _
"log.txt" | tail _ lines=10

# Placeholder positioning flexibility
"error.log" | grep "ERROR" _ | head _ 5
data | process format="json" input=_

# Multiple placeholders (future consideration)
value | combine _ _ 
```

**Why this design:**
- **`|` over `|>`**: Cleaner, more shell-like
- **`_` placeholder**: Explicit, readable, flexible positioning
- **Gleam-inspired**: Best of functional programming meets shell scripting

### Conditionals

**Multi-line syntax:**
```shrimp
if condition:
  expression
elsif other-condition:
  expression  
else:
  expression
end
```

**Single-line syntax (expression form):**
```shrimp
result = if x = 5: "five"
# Returns nil when false

result = if x > 0: "positive" else: "non-positive"
# Explicit else for non-nil guarantee
```

**Design choices:**
- **`elsif` not `else if`**: Avoids nested parsing complexity (Ruby-style)
- **`:` after conditions**: Consistent with function definitions
- **`=` for equality**: Context-sensitive (assignment vs comparison)
- **`nil` for no-value**: Short, clear, well-understood
- **Expressions return values**: Everything is an expression philosophy

## 📝 Implementation Plan

### Phase 1: Grammar Foundation

**1.1 Add Tokens**
```grammar
@tokens {
  // Existing...
  "|"        // Pipe operator
  "_"        // Placeholder
  "if"       // Conditionals
  "elsif"
  "else"
  "nil"      // Null value
}
```

**1.2 Precedence Updates**
```grammar
@precedence {
  multiplicative @left,
  additive @left,
  pipe @left,        // After arithmetic, before assignment
  assignment @right,
  call
}
```

### Phase 2: Grammar Rules

**2.1 Pipe Expression**
```grammar
PipeExpr {
  expression !pipe "|" PipeTarget
}

PipeTarget {
  FunctionCallWithPlaceholder |
  FunctionCall  // Error in compiler if no placeholder
}

FunctionCallWithPlaceholder {
  Identifier PlaceholderArg+
}

PlaceholderArg {
  PositionalArg | NamedArg | Placeholder
}

Placeholder {
  "_"
}
```

**2.2 Conditional Expression**
```grammar
Conditional {
  SingleLineIf | MultiLineIf
}

SingleLineIf {
  "if" Comparison ":" expression ElseClause?
}

MultiLineIf {
  "if" Comparison ":" newlineOrSemicolon 
    (line newlineOrSemicolon)*
  ElsifClause*
  ElseClause?
  "end"
}

ElsifClause {
  "elsif" Comparison ":" newlineOrSemicolon
    (line newlineOrSemicolon)*
}

ElseClause {
  "else" ":" (expression | (newlineOrSemicolon (line newlineOrSemicolon)*))
}

Comparison {
  expression "=" expression  // Context-sensitive in if/elsif
}
```

**2.3 Update line rule**
```grammar
line {
  PipeExpr |
  Conditional |
  FunctionCall |
  // ... existing rules
}
```

### Phase 3: Test Cases

**Pipe Tests:**
```shrimp
# Basic placeholder
"hello" | upcase _

# Named arguments with placeholder
"file.txt" | process _ format="json"

# Chained pipes
data | filter _ "error" | count _

# Placeholder in different positions
5 | subtract 10 _  # 10 - 5 = 5
```

**Conditional Tests:**
```shrimp
# Single line
x = if n = 0: "zero"

# Single line with else
sign = if n > 0: "positive" else: "negative"

# Multi-line
if score > 90:
  grade = "A"
elsif score > 80:
  grade = "B"  
else:
  grade = "C"
end

# Nested conditionals
if x > 0:
  if y > 0:
    quadrant = 1
  end
end
```

### Phase 4: Compiler Implementation

**4.1 PipeExpr Handling**
- Find placeholder position in right side
- Insert left side value at placeholder
- Error if no placeholder found

**4.2 Conditional Compilation**
- Generate JUMP bytecode for branching
- Handle nil returns for missing else
- Context-aware `=` parsing

## 🎯 Key Decision Points

1. **Placeholder syntax**: `_` vs `$` vs `?` → **Choose `_` (Gleam-like)**
2. **Pipe operator**: `|` vs `|>` vs `>>` → **Choose `|` (cleaner)**
3. **Nil naming**: `nil` vs `null` vs `none` → **Choose `nil` (Ruby-like)**
4. **Equality**: Keep `=` context-sensitive or add `==`? → **Keep `=` (simpler)**
5. **Single-line if**: Require else or default nil? → **Default nil (flexible)**

## 🚀 Next Steps

1. Update grammar file with new tokens and rules
2. Write comprehensive test cases
3. Implement compiler support for pipes
4. Implement conditional bytecode generation
5. Test edge cases and error handling

This plan combines the best ideas from modern languages while maintaining Shrimp's shell-like simplicity and functional philosophy!