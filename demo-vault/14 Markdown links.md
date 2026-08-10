# Markdown links

The same idea as [Wikilinks](<./13 Wikilinks.md>), for vaults configured to use markdown-style links: `require()` accepts a full markdown link and loads what it points at. Rename the script and Obsidian rewrites the link for you, so the require does not rot.

```code-button
---
caption: Require via markdown link (sync)
---
const { vaultRootRelativePath } = require('[Script](_assets/CodeScriptToolkit/vaultRootRelativePath.js)');
vaultRootRelativePath();
```

```code-button
---
caption: Require via markdown link (async)
---
const { vaultRootRelativePath } = await requireAsync('[Script](_assets/CodeScriptToolkit/vaultRootRelativePath.js)');
vaultRootRelativePath();
```

## Options

Angle brackets around the target are accepted — which is what Obsidian writes when the path contains spaces:

```code-button
---
caption: Require via markdown link with angle brackets (sync)
---
const { vaultRootRelativePath } = require('[Script](<_assets/CodeScriptToolkit/vaultRootRelativePath.js>)');
vaultRootRelativePath();
```

## Platform support

|                                      | Desktop | Mobile |
| ------------------------------------ | ------- | ------ |
| **[`require()`][require]**           | ✅      | ✅     |
| **[`requireAsync()`][requireAsync]** | ✅      | ✅     |

[require]: <./40 Core functions.md#require>
[requireAsync]: <./40 Core functions.md#requireasync>
