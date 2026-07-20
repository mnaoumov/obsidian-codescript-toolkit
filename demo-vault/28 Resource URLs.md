[Docs](https://github.com/mnaoumov/obsidian-codescript-toolkit/blob/main/docs/resource-urls.md)

```code-button
---
caption: Require resource URLs (requires changing resource prefix to match your vault's current prefix)
---
const correctVaultPathPrefix = app.vault.getResourcePath(app.vault.getRoot()).split('/?')[0];
console.warn(`Correct vault path prefix should be: ${correctVaultPathPrefix}`);

const { resourceUrl } = require('app://8fa431797ac41f5914dffee8999b77071151/C:/path/to/vault/obsidian-codescript-toolkit-demo-vault/_assets/CodeScriptToolkit/resourceUrl.js');
resourceUrl();
```
