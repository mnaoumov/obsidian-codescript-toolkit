[Docs](https://github.com/mnaoumov/obsidian-codescript-toolkit/blob/main/docs/clear-cache.md)

```code-button
---
caption: Smart caching (first click)
---
const { cacheInvalidationModeNever } = await requireAsync('/cacheInvalidationModeNever.js', { cacheInvalidationMode: 'never' });

cacheInvalidationModeNever();
```

```code-button
---
caption: Smart caching (second click)
---
const { cacheInvalidationModeNever } = await requireAsync('/cacheInvalidationModeNever.js', { cacheInvalidationMode: 'never' });

cacheInvalidationModeNever();
```

Invoke `CodeScript Toolkit: Clear cache` command.

```code-button
---
caption: Smart caching (third click)
---
const { cacheInvalidationModeNever } = await requireAsync('/cacheInvalidationModeNever.js', { cacheInvalidationMode: 'never' });

cacheInvalidationModeNever();
```
