# Clear cache

[Smart caching](<./31 Smart caching.md>) normally notices your edits by itself. When it deliberately does not — a module required with `cacheInvalidationMode: 'never'`, or one whose source changed somewhere the plugin cannot watch — the **CodeScript Toolkit: Clear cache** command drops everything, so the next require starts fresh. It is the "turn it off and on again" for module loading, without restarting Obsidian.

Click the first button, then the second: the module is cached with `never`, so both print the same thing.

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

Now invoke the **CodeScript Toolkit: Clear cache** command, and click the third button — the module is loaded again from disk.

```code-button
---
caption: Smart caching (third click)
---
const { cacheInvalidationModeNever } = await requireAsync('/cacheInvalidationModeNever.js', { cacheInvalidationMode: 'never' });

cacheInvalidationModeNever();
```

## Platform support

| Desktop | Mobile |
| ------- | ------ |
| ✅      | ✅     |
