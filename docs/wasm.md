# WebAssembly (WASM)

|                                       | Desktop | Mobile |
| ------------------------------------- | ------- | ------ |
| **[`require()`][require]           | ❌       | ❌      |
| **[`requireAsync()`][requireAsync] | ✅       | ✅      |

You can require WebAssembly binaries `.wasm`.

```js
await requireAsync('./foo.wasm');
```

[require]: ./new-functions.md#require
[requireAsync]: ./new-functions.md#requireasync
