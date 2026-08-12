# Root-relative path

Address a script from your scripts root with a leading `/`, instead of counting `../../..` hops from whichever note you happen to be in. Move the note later and the require still resolves.

```code-button
---
caption: Require root-relative path
---
const { rootRelativePath } = require('/rootRelativePath.js');
rootRelativePath();
```

## Options

Which folder `/` means is the **Modules root** setting in the plugin's settings tab. In this vault it is `_assets/CodeScriptToolkit`, so `/rootRelativePath.js` is `_assets/CodeScriptToolkit/rootRelativePath.js`. To address the vault root instead, see [Vault-root-relative path](<./07 Vault-root-relative path.md>).

## Platform support

|                                      | Desktop | Mobile |
| ------------------------------------ | ------- | ------ |
| **[`require()`][require]**           | ✅      | ❌     |
| **[`requireAsync()`][requireAsync]** | ✅      | ✅     |

[require]: <../02 Core functions.md#require>
[requireAsync]: <../02 Core functions.md#requireasync>
