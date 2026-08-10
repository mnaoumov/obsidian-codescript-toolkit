# WebAssembly

Load a `.wasm` binary and call its exports like an ordinary module. Unlike [Node binaries](<./20 Node binaries.md>), WebAssembly runs on mobile too — so it is the portable way to use something compiled from Rust, C, or Go inside your vault.

```code-button
---
caption: Require WebAssembly
---
const { answer } = await requireAsync('/module.wasm');
console.log(answer());
```

## Caveats

Instantiating a WebAssembly module is asynchronous, so this needs [`requireAsync()`](<./40 Core functions.md#requireasync>) — plain `require()` cannot load it. To use one from synchronous-looking code, pre-load it with [`requireAsyncWrapper()`](<./32 requireAsyncWrapper.md>).

## Platform support

|                                      | Desktop | Mobile |
| ------------------------------------ | ------- | ------ |
| **[`require()`][require]**           | ❌      | ❌     |
| **[`requireAsync()`][requireAsync]** | ✅      | ✅     |

[require]: <./40 Core functions.md#require>
[requireAsync]: <./40 Core functions.md#requireasync>
