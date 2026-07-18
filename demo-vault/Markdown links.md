[Docs](https://github.com/mnaoumov/obsidian-codescript-toolkit/blob/main/docs/markdown-links.md)

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

```code-button
---
caption: Require via markdown link with angle brackets (sync)
---
const { vaultRootRelativePath } = require('[Script](<_assets/CodeScriptToolkit/vaultRootRelativePath.js>)');
vaultRootRelativePath();
```
