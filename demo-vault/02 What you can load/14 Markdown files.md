# Markdown files

Keep code in a note and require it like a module. The code lives in a ` ```code-script ` block, so the note stays readable, linkable and searchable — you can write the explanation and the implementation in the same place instead of splitting them across a note and a `.js` file.

```code-button
---
caption: Require Markdown files
---
const { markdown } = require('/module.md');
markdown();
```

## Options

One note can hold several script blocks. The first is the default; any block whose first line is `// codeScriptName: <name>` can be requested by name with `?codeScriptName=<name>`:

```code-button
---
caption: Require Markdown files with named script block
---
const { markdownWithNamedScriptBlock } = require('/module.md?codeScriptName=namedScriptBlock');
markdownWithNamedScriptBlock();
```

The note this loads looks like:

````markdown
```code-script
export function baz(): void {
}
```

```code-script
// codeScriptName: bar
export function qux(): void {
}
```
````

Frontmatter changes which block is the default and whether the note is invocable:

````markdown
---
codeScriptToolkit:
  defaultCodeScriptName: foo
  invocableCodeScriptName: bar
  isInvocable: true
---
````

| Key                       | Meaning                                                                                                                       |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `defaultCodeScriptName`   | which block to use when `?codeScriptName=...` is omitted                                                                      |
| `invocableCodeScriptName` | which block to run via [Invoke scripts](<../06 Running scripts without a button/38 Invoke scripts.md>)                        |
| `isInvocable`             | whether this note appears in the [Invoke scripts](<../06 Running scripts without a button/38 Invoke scripts.md>) command list |

```code-button
---
caption: Require Markdown files with default named script block
---
const { markdownWithDefaultNamedScriptBlock } = require('/defaultNamedModule.md');
markdownWithDefaultNamedScriptBlock();
```

## Invocable markdown modules

Two notes in this vault set `isInvocable: true`, so they show up as commands you can run from the `Command Palette`:

- `CodeScript Toolkit: Invoke script: invocableMarkdownModule.md`
- `CodeScript Toolkit: Invoke script: namedInvocableMarkdownModule.md`

## Platform support

|                                      | Desktop | Mobile |
| ------------------------------------ | ------- | ------ |
| **[`require()`][require]**           | ✅      | ✅     |
| **[`requireAsync()`][requireAsync]** | ✅      | ✅     |

[require]: <../02 Core functions.md#require>
[requireAsync]: <../02 Core functions.md#requireasync>
