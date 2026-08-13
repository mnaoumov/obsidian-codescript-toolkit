# Wikilinks

Require a script through Obsidian's own link syntax. Because it is a real link, Obsidian keeps it pointing at the right file when you rename or move the script — and it behaves like any other link, so you can follow it straight from the note.

```code-button
---
caption: Require via wikilink (sync)
---
const { vaultRootRelativePath } = require('[[_assets/CodeScriptToolkit/vaultRootRelativePath.js]]');
vaultRootRelativePath();
```

```code-button
---
caption: Require via wikilink (async)
---
const { vaultRootRelativePath } = await requireAsync('[[_assets/CodeScriptToolkit/vaultRootRelativePath.js]]');
vaultRootRelativePath();
```

## Options

An alias after `|` is accepted and ignored for resolution, so a link you wrote for readability still requires correctly:

```code-button
---
caption: Require via wikilink with alias (sync)
---
const { vaultRootRelativePath } = require('[[_assets/CodeScriptToolkit/vaultRootRelativePath.js|My Script]]');
vaultRootRelativePath();
```

If your vault is configured to use markdown links rather than wikilinks, see [Markdown links](<./10 Markdown links.md>) — both forms are supported.

## Platform support

|                                      | Desktop | Mobile |
| ------------------------------------ | ------- | ------ |
| **[`require()`][require]**           | ✅      | ✅     |
| **[`requireAsync()`][requireAsync]** | ✅      | ✅     |

[require]: <../02 Core functions.md#require>
[requireAsync]: <../02 Core functions.md#requireasync>
