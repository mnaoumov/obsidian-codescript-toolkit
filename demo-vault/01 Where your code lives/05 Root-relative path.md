# Root-relative path

Address a script from your scripts root with a leading `/`, instead of counting `../../..` hops from whichever note you happen to be in. Move the note later and the require still resolves.

```code-button
---
caption: Require root-relative path
---
const { rootRelativePath } = require('/Paths/rootRelativePath.js');
rootRelativePath();
```

## Options

Which folder `/` means is the **Modules root** setting in the plugin's settings tab. In this vault it is `_assets/CodeScriptToolkit`, so `/Paths/rootRelativePath.js` is `_assets/CodeScriptToolkit/Paths/rootRelativePath.js`. To address the vault root instead, see [Vault-root-relative path](<./07 Vault-root-relative path.md>).

On desktop, if no script matches under Modules root and the path exists on the filesystem, it is loaded as a native absolute path instead. This lets other plugins load their own packages; package directories use Node's entry-point resolution. An existing script under Modules root takes priority. Use [System root path](<./06 System root path.md>) to select the filesystem path explicitly on Linux or macOS.

## Platform support

|                                      | Desktop | Mobile |
| ------------------------------------ | ------- | ------ |
| **[`require()`][require]**           | ✅      | ❌     |
| **[`requireAsync()`][requireAsync]** | ✅      | ✅     |

[require]: <../02 Core functions.md#require>
[requireAsync]: <../02 Core functions.md#requireasync>
