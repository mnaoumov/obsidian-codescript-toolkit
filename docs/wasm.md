# WebAssembly (WASM)

|                                      | Desktop | Mobile |
| ------------------------------------ | ------- | ------ |
| **[`require()`][require]**           | ❌       | ❌      |
| **[`requireAsync()`][requireAsync]** | ✅       | ✅      |

You can require WebAssembly binaries `.wasm`.

```js
await requireAsync('./foo.wasm');
```

[require]: ./core-functions.md#require
[requireAsync]: ./core-functions.md#requireasync
