# Markdown files

|                                      | Desktop | Mobile |
| ------------------------------------ | ------- | ------ |
| **[`require()`][require]**           | ✅       | ✅      |
| **[`requireAsync()`][requireAsync]** | ✅       | ✅      |

You can require content of `.md` files from `code-script` code blocks.

```js
require('./foo.md'); // require the default script block
require('./foo.md?codeScriptName=bar'); // require the named script block
```

**`foo.md`**

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

The first `code-script` code block in the file is a default script block used when `?codeScriptName=...` part is not specified.

If the first line of the `code-script` code block has special format `// codeScriptName: ...`, this name can be used for query `?codeScriptName=...`.

You can customize behavior via frontmatter of the note.

````markdown
---
codeScriptToolkit:
  defaultCodeScriptName: foo
  invocableCodeScriptName: bar
  isInvocable: true
---
````

- `defaultCodeScriptName` - name of the code block to be used when `?codeScriptName=...` part is not specified.
- `invocableCodeScriptName` - name of the code block to be used when running the note via [Invoke Scripts](./invoke-scripts.md).
- `isInvocable` - whether to add the current note into the list for [Invoke Scripts](./invoke-scripts.md) commands.

[require]: ./core-functions.md#require
[requireAsync]: ./core-functions.md#requireasync
