[Docs](https://github.com/mnaoumov/obsidian-codescript-toolkit/blob/main/docs/file-urls.md)

```code-button
---
caption: Require file URL path
---
// The `file:///` URL is machine-specific, so build it from the current vault's real system path.
const vaultPathPrefix = 'file:///' + app.vault.adapter.basePath.replaceAll('\\', '/');

const { fileUrl } = require(`${vaultPathPrefix}/_assets/CodeScriptToolkit/fileUrl.js`);
fileUrl();
```
