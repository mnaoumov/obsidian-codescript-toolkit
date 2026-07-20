[Docs](https://github.com/mnaoumov/obsidian-codescript-toolkit/blob/main/docs/core-functions.md#requireasyncwrapper)

```code-button
---
caption: requireAsyncWrapper
---
await requireAsyncWrapper((require) => {
  // WASM is not available for synchronous `require()` normally; `requireAsyncWrapper` pre-loads it so
  // the synchronous-style `require()` below works. `cacheInvalidationMode: 'never'` returns the
  // pre-loaded module from cache instead of trying to re-validate it (which cannot be done synchronously).
  const { answer } = require('/module.wasm', { cacheInvalidationMode: 'never' });
  const message = `requireAsyncWrapper: ${answer()}`;
  new (require('obsidian').Notice)(message);
  console.log(message);
});
```
