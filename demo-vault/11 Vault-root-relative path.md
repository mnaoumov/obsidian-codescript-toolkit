# Vault-root-relative path

Address a file from the vault root with a leading `//`, whatever the plugin's modules root is set to. Use it when a script needs something that is genuinely vault content — an attachment, a note, a data file — rather than part of your script library.

```code-button
---
caption: Require vault-root-relative path
---
const { vaultRootRelativePath } = require('//_assets/CodeScriptToolkit/vaultRootRelativePath.js');
vaultRootRelativePath();
```

## Options

Three roots, three prefixes, easy to mix up:

| Prefix | Resolves against                                              |
| ------ | ------------------------------------------------------------- |
| `./`   | the current script or note — [Relative path](<./08 Relative path.md>) |
| `/`    | the configured modules root — [Root-relative path](<./09 Root-relative path.md>) |
| `//`   | the vault root — this note                                    |

## Platform support

|                                      | Desktop | Mobile |
| ------------------------------------ | ------- | ------ |
| **[`require()`][require]**           | ✅      | ❌     |
| **[`requireAsync()`][requireAsync]** | ✅      | ✅     |

[require]: <./40 Core functions.md#require>
[requireAsync]: <./40 Core functions.md#requireasync>
