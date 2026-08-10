# Override module type

Normally the file extension decides how a file is loaded. When the extension lies — a JavaScript file saved as `.txt`, a JSON payload with a vendor-specific suffix, a downloaded file with no extension at all — tell the loader what it really is with `moduleType`.

```code-button
---
caption: Override module type
---
const { overrideModuleType } = require('/module.unknownExtension', { moduleType: 'jsTs' });
overrideModuleType();
```

## Options

| Value  | Loads as                                                       |
| ------ | -------------------------------------------------------------- |
| `json` | [JSON files](<./19 JSON files.md>)                             |
| `jsTs` | JavaScript/TypeScript: `.js`/`.cjs`/`.mjs`/`.ts`/`.cts`/`.mts` |
| `md`   | [Markdown files](<./23 Markdown files.md>)                     |
| `node` | [Node binaries](<./20 Node binaries.md>)                       |
| `wasm` | [WebAssembly](<./21 WebAssembly.md>)                           |

The same option is useful for [URLs](<./26 URLs.md>), where the server's `Content-Type` header is often missing or too generic to trust.

## Platform support

|                                      | Desktop | Mobile |
| ------------------------------------ | ------- | ------ |
| **[`require()`][require]**           | ✅      | ✅     |
| **[`requireAsync()`][requireAsync]** | ✅      | ✅     |

[require]: <./40 Core functions.md#require>
[requireAsync]: <./40 Core functions.md#requireasync>
