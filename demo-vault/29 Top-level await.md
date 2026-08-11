# Top-level await

Use `await` at the top level of a module — no wrapping everything in an `async function main()` just to call one asynchronous thing. A module can fetch its configuration, open a connection, or read a file before it exports anything.

```code-button
---
caption: Require top-level await
---
await requireAsync('/topLevelAwait.js');
```

The module it loads is simply:

```js
// topLevelAwait.js
await Promise.resolve(); // top-level await
export const dep = 42;
```

## Caveats

A module that awaits at the top level cannot finish loading synchronously, so `require()` cannot load it on any platform — use [`requireAsync()`](<./02 Core functions.md#requireasync>), or pre-load it with [`requireAsyncWrapper()`](<./34 requireAsyncWrapper.md>) if the surrounding code has to stay synchronous.

## Platform support

|                                      | Desktop | Mobile |
| ------------------------------------ | ------- | ------ |
| **[`require()`][require]**           | ❌      | ❌     |
| **[`requireAsync()`][requireAsync]** | ✅      | ✅     |

[require]: <./02 Core functions.md#require>
[requireAsync]: <./02 Core functions.md#requireasync>
