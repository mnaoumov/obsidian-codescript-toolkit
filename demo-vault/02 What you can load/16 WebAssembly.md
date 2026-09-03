# WebAssembly

Load a `.wasm` binary and call its exports like an ordinary module. Unlike [Node binaries](<./15 Node binaries.md>), WebAssembly runs on mobile too — so it is the portable way to use something compiled from Rust, C, or Go inside your vault.

```code-button
---
caption: Require WebAssembly
---
const { answer } = await requireAsync('/module.wasm');
console.log(answer());
```

## The module in this vault

The plugin bundles no WebAssembly of its own — it loads only what your vault already contains. The `/module.wasm` the button above loads is this vault's own 39-byte example at `_assets/CodeScriptToolkit/module.wasm`, and its source is checked in beside it as [`module.wat`](<../_assets/CodeScriptToolkit/module.wat>):

```wat
(module
  (func (export "answer") (result i32)
    i32.const 42))
```

It exports one function, `answer()`, returning the constant `42`, and imports nothing at all — no [WASI](https://wasi.dev/), no host functions, no memory — so returning that number is the only thing it can do. `wat2wasm` from [WABT](https://github.com/WebAssembly/wabt) rebuilds the checked-in binary from that source byte for byte, which is how you can confirm the 39 bytes are nothing more than what you see above.

## Caveats

Instantiating a WebAssembly module is asynchronous, so this needs [`requireAsync()`](<../02 Core functions.md#requireasync>) — plain `require()` cannot load it. To use one from synchronous-looking code, pre-load it with [`requireAsyncWrapper()`](<../05 Behavior and performance/35 requireAsyncWrapper.md>).

## Platform support

|                                      | Desktop | Mobile |
| ------------------------------------ | ------- | ------ |
| **[`require()`][require]**           | ❌      | ❌     |
| **[`requireAsync()`][requireAsync]** | ✅      | ✅     |

[require]: <../02 Core functions.md#require>
[requireAsync]: <../02 Core functions.md#requireasync>
