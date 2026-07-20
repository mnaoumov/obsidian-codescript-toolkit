[Docs](https://github.com/mnaoumov/obsidian-codescript-toolkit/blob/main/docs/core-functions.md#requireasyncwrapper)

```code-button
---
caption: requireAsyncWrapper
---
await requireAsyncWrapper((require) => {
  // Requiring from a URL is not available for synchronous `require()` normally;
  // `requireAsyncWrapper` pre-loads it so the synchronous-style `require()` below works.
  const { url } = require('https://raw.githubusercontent.com/mnaoumov/obsidian-codescript-toolkit-demo-vault/refs/heads/main/_assets/CodeScriptToolkit/url.js');
  url();
});
```
