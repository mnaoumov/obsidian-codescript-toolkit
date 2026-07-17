---
module:
  language: TypeScript
---

```TypeScript
export function runFromCodeScriptToolkit() {
  const message = 'Run CustomJS from CodeScript Toolkit'
  new Notice(message);
  console.log(message);
}

export function runCodeScriptToolkit() {
  const { runFromModules } = require('/integrateWithOtherPlugins.js');
  runFromModules();
}
```
