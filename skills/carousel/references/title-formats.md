# Carousel Title Formats

Reference for the `title` field on each content slide, plus comparison-slide layout. Loaded on demand from the carousel SKILL.md Step 2 / Step 4.


### Token Mode (PREFERRED for code/queries — Shiki-style syntax highlighting)

Use an array of `{ type, text }` objects. Each token gets a colored span.

Available token types and colors (One Dark Pro theme):
- `keyword` — purple #c678dd (SELECT, FROM, WHERE, function, return, const, if)
- `function` — blue #61afef (function names, method calls)
- `string` — green #98c379 (string literals, quoted values)
- `number` — orange #d19a66 (numeric literals)
- `operator` — cyan #56b6c2 (=, >, <, +, -, *, AND, OR)
- `variable` — red #e06c75 (variable names, parameters)
- `type` — yellow #e5c07b (type names, class names)
- `comment` — gray #7f848e italic (comments)
- `punctuation` — light gray #abb2bf (brackets, commas, semicolons)
- `property` — blue #61afef (object properties, column names)
- `prompt` — brand purple #9a53ff ($ prompt symbol)
- `cmd` — light purple #c4b5fd (command names)
- `arg` — white (arguments)
- `plain` — white, no span wrapper (spaces, plain text)

SQL example:

```json
{
  "tokens": [
    { "type": "keyword", "text": "SELECT" },
    { "type": "plain", "text": " " },
    { "type": "operator", "text": "*" },
    { "type": "plain", "text": " " },
    { "type": "keyword", "text": "FROM" },
    { "type": "plain", "text": " " },
    { "type": "property", "text": "users" }
  ]
}
```

CLI command example:

```json
{
  "tokens": [
    { "type": "prompt", "text": "$" },
    { "type": "plain", "text": " " },
    { "type": "cmd", "text": "docker" },
    { "type": "plain", "text": " " },
    { "type": "arg", "text": "build" },
    { "type": "plain", "text": " " },
    { "type": "string", "text": "." }
  ]
}
```

JavaScript example:

```json
{
  "tokens": [
    { "type": "keyword", "text": "const" },
    { "type": "plain", "text": " [" },
    { "type": "variable", "text": "state" },
    { "type": "plain", "text": "] = " },
    { "type": "function", "text": "useState" },
    { "type": "punctuation", "text": "()" }
  ]
}
```

### Command Mode (shorthand for CLI tools)

```json
{ "prompt": "$", "cmd": "docker", "arg": "build" }
```

### Text Mode (plain concepts with no code syntax)

```json
{ "text": "Strategy Pattern" }
```

### Comparison Mode (BAD vs GOOD code — for "mistakes" carousels)

Use `"type": "comparison"` on the slide to render a two-block layout with red BAD
and green GOOD code. Both `bad` and `good` accept tokens or plain text.

```json
{
  "type": "comparison",
  "title": "String Comparison",
  "bad": {
    "tokens": [
      { "type": "keyword", "text": "if" },
      { "type": "plain", "text": " (" },
      { "type": "variable", "text": "name" },
      { "type": "plain", "text": " " },
      { "type": "operator", "text": "==" },
      { "type": "plain", "text": " " },
      { "type": "string", "text": "\"John\"" },
      { "type": "punctuation", "text": ")" }
    ]
  },
  "good": {
    "tokens": [
      { "type": "keyword", "text": "if" },
      { "type": "plain", "text": " (" },
      { "type": "variable", "text": "name" },
      { "type": "punctuation", "text": "." },
      { "type": "function", "text": "equals" },
      { "type": "punctuation", "text": "(" },
      { "type": "string", "text": "\"John\"" },
      { "type": "punctuation", "text": "))" }
    ]
  }
}
```

Use comparison mode for "10 Java Mistakes", "Python Anti-Patterns", "JavaScript Code
Smells", "SQL: Wrong vs Right". Keep code SHORT (1-2 lines, ~30 chars wide; the font
is 36px so long lines wrap).

