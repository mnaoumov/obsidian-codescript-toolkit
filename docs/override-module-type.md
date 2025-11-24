# Override module type

|                                      | Desktop | Mobile |
| ------------------------------------ | ------- | ------ |
| **[`require()`][require]**           | ✅       | ✅      |
| **[`requireAsync()`][requireAsync]** | ✅       | ✅      |

Module type is determined via file extension. You can override it if needed.

```js
require('./actual-js-file.some-unknown-extension', { moduleType: 'jsTs' });
```

Possible values:

- `json` - [JSON files](./json.md).
- `jsTs` - JavaScript/TypeScript files: `.js`/`.cjs`/`.mjs`/`.ts`/`.cts`/`.mts`.
- `md` - [Markdown files](./markdown.md).
- `node` - [Node binaries](./node-binaries.md).
- `wasm` - [WebAssembly (WASM)](./wasm.md).

[require]: ./core-functions.md#require
[requireAsync]: ./core-functions.md#requireasync
