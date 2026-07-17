[Docs](https://github.com/mnaoumov/obsidian-codescript-toolkit/blob/main/docs/core-functions.md#requireasyncwrapper)

```code-button
---
caption: requireAsyncWrapper
---
await requireAsyncWrapper((require) => {
  const { answer } = require('/module.wasm');
  const message = `requireAsyncWrapper: ${answer()}`;
  new (require('obsidian').Notice)(message);
  console.log(message);
});
```
