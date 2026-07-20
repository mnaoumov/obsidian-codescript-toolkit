[Docs](https://github.com/mnaoumov/obsidian-codescript-toolkit/blob/main/docs/system-root-path.md)

```code-button
---
caption: Require system root path (requires changing code to match your vault's real system path, applicable only on Linux/MacOS)
---
import { Platform } from 'obsidian';

if (!Platform.isLinux && !Platform.isMacOS) {
  console.warn('Not applicable on your OS');
  return;
}

const correctVaultPathPrefix = '~/' + app.vault.adapter.basePath;
console.warn(`Correct vault path prefix should be: ${correctVaultPathPrefix}`);

const { systemRootPath } = require('~/path/to/vault/obsidian-codescript-toolkit-demo-vault/_assets/CodeScriptToolkit/systemRootPath.js');
systemRootPath();
```
