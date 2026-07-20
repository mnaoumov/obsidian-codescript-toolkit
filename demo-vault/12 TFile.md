[Docs](https://github.com/mnaoumov/obsidian-codescript-toolkit/blob/main/docs/tfile.md)

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
