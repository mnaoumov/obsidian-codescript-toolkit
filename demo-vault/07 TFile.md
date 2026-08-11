# TFile

Pass an Obsidian `TFile` straight to `require()` instead of turning it back into a string path. Handy when you already have the file object — from `getActiveFile()`, from a search, from iterating a folder — and want to load it as a module without worrying about how its path needs escaping.

```code-button
---
caption: Require via TFile (sync)
---
const file = app.vault.getFileByPath('_assets/CodeScriptToolkit/vaultRootRelativePath.js');
const { vaultRootRelativePath } = require(file);
vaultRootRelativePath();
```

```code-button
---
caption: Require via TFile (async)
---
const file = app.vault.getFileByPath('_assets/CodeScriptToolkit/vaultRootRelativePath.js');
const { vaultRootRelativePath } = await requireAsync(file);
vaultRootRelativePath();
```

## Platform support

|                                      | Desktop | Mobile |
| ------------------------------------ | ------- | ------ |
| **[`require()`][require]**           | ✅      | ✅     |
| **[`requireAsync()`][requireAsync]** | ✅      | ✅     |

[require]: <./02 Core functions.md#require>
[requireAsync]: <./02 Core functions.md#requireasync>
