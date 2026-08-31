---
query:
  limit: 5
queryModulePath: /QueryModules/recentlyModified.ts
---

The host note of [47 Parameterized Dataview queries](<../../08 Working with other plugins/47 Parameterized Dataview queries.md>). Its frontmatter above says which question is being asked; the block below answers it.

```dataviewjs
const { executeQuery } = await requireAsync('/queryDispatcher.ts');
await executeQuery(dv);
```
