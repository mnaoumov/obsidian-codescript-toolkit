# System root path

Require a file by its absolute path on Linux or macOS — a shared script library outside the vault, something checked out in `~/code`. A bare leading `/` already means [Root-relative path](<./04 Root-relative path.md>), so prefix the path with `~` to say "the real filesystem root" instead.

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

## Caveats

The path above is somebody else's; the button prints the prefix that is correct for *your* vault, so edit the require to match before expecting it to load anything. On Windows this form does not apply — use [File URLs](<./27 File URLs.md>) to reach outside the vault.

## Platform support

|                                      | Desktop | Mobile |
| ------------------------------------ | ------- | ------ |
| **[`require()`][require]**           | ✅      | ❌     |
| **[`requireAsync()`][requireAsync]** | ✅      | ✅     |

[require]: <./02 Core functions.md#require>
[requireAsync]: <./02 Core functions.md#requireasync>
