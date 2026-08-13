# File URLs

Load a script by `file:///` URL — the way to reach a file outside the vault on any desktop OS, including Windows, where the `~` form of [System root path](<../01 Where your code lives/06 System root path.md>) does not apply. Useful for a shared script library you keep in version control next to the rest of your code.

```code-button
---
caption: Require file URL path
---
// The `file:///` URL is machine-specific, so build it from the current vault's real system path.
const vaultPathPrefix = 'file:///' + app.vault.adapter.basePath.replaceAll('\\', '/');

const { fileUrl } = require(`${vaultPathPrefix}/_assets/CodeScriptToolkit/fileUrl.js`);
fileUrl();
```

## Caveats

A `file:///` URL names an absolute location on one machine, so hard-coding one stops the script working anywhere else — build it at runtime as the button does. On mobile there is no filesystem to address this way with `require()`.

## Platform support

|                                      | Desktop | Mobile |
| ------------------------------------ | ------- | ------ |
| **[`require()`][require]**           | ✅      | ❌     |
| **[`requireAsync()`][requireAsync]** | ✅      | ✅     |

[require]: <../02 Core functions.md#require>
[requireAsync]: <../02 Core functions.md#requireasync>
