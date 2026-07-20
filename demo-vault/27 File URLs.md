[Docs](https://github.com/mnaoumov/obsidian-codescript-toolkit/blob/main/docs/file-urls.md)

```code-button
---
caption: Require file URL path (requires changing code to match your vault's real system path)
---
const correctVaultPathPrefix = 'file:///' + app.vault.adapter.basePath.replaceAll('\\', '/');
console.warn(`Correct vault path prefix should be: ${correctVaultPathPrefix}`);

const { fileUrl } = require('file:///C:/path/to/vault/obsidian-codescript-toolkit-demo-vault/_assets/CodeScriptToolkit/fileUrl.js');
fileUrl();
```
