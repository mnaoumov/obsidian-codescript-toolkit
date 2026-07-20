[Docs](https://github.com/mnaoumov/obsidian-codescript-toolkit/blob/main/docs/smart-caching.md)

```code-button
---
caption: Smart caching (first click)
---
const { cacheInvalidationModeAlways } = await requireAsync('/cacheInvalidationModeAlways.js', { cacheInvalidationMode: 'always' });
const { cacheInvalidationModeNever } = await requireAsync('/cacheInvalidationModeNever.js', { cacheInvalidationMode: 'never' });
const { cacheInvalidationModeWhenPossible } = await requireAsync('/cacheInvalidationModeWhenPossible.js', { cacheInvalidationMode: 'whenPossible' });
const { cacheInvalidationModeWhenPossibleWithQueryString } = await requireAsync('/cacheInvalidationModeWhenPossibleWithQueryString.js?someQueryString', { cacheInvalidationMode: 'whenPossible' });

cacheInvalidationModeAlways();
cacheInvalidationModeNever();
cacheInvalidationModeWhenPossible();
cacheInvalidationModeWhenPossibleWithQueryString();
```

```code-button
---
caption: Smart caching (second click)
---
const { cacheInvalidationModeAlways } = await requireAsync('/cacheInvalidationModeAlways.js', { cacheInvalidationMode: 'always' });
const { cacheInvalidationModeNever } = await requireAsync('/cacheInvalidationModeNever.js', { cacheInvalidationMode: 'never' });
const { cacheInvalidationModeWhenPossible } = await requireAsync('/cacheInvalidationModeWhenPossible.js', { cacheInvalidationMode: 'whenPossible' });
const { cacheInvalidationModeWhenPossibleWithQueryString } = await requireAsync('/cacheInvalidationModeWhenPossibleWithQueryString.js?someQueryString', { cacheInvalidationMode: 'whenPossible' });

cacheInvalidationModeAlways();
cacheInvalidationModeNever();
cacheInvalidationModeWhenPossible();
cacheInvalidationModeWhenPossibleWithQueryString();
```
