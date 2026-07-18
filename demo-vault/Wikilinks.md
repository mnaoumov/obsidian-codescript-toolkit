[Docs](https://github.com/mnaoumov/obsidian-codescript-toolkit/blob/main/docs/wikilinks.md)

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

```code-button
---
caption: Require via wikilink with alias (sync)
---
const { vaultRootRelativePath } = require('[[_assets/CodeScriptToolkit/vaultRootRelativePath.js|My Script]]');
vaultRootRelativePath();
```
