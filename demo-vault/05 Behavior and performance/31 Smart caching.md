# Smart caching

Modules are cached so repeated requires are fast, but the cache is invalidated when a script — or anything it depends on — changes. That means you can edit a script and re-run it without restarting Obsidian or clearing anything, which is what makes iterating on vault scripts bearable.

Click the first button, then the second, and compare the output: the four modules differ in how aggressively they re-check for changes.

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

## Options

| `cacheInvalidationMode` | Behavior                                                                |
| ----------------------- | ----------------------------------------------------------------------- |
| `always`                | always fetch the latest version, ignoring the cache                     |
| `never`                 | always use the cached version, ignoring any changes to the module       |
| `whenPossible`          | fetch the latest version when that is possible, otherwise use the cache |

A query string has the same effect as `never` (except for URLs, where it is part of the address):

```js
require('./someScript.js?someQuery'); // cacheInvalidationMode: 'never'
require('https://some-site.com/some-script.js?someQuery'); // cacheInvalidationMode: 'whenPossible'
```

`never` is also the performance lever: for code that runs many times — in a `dataviewjs` block that re-renders constantly, say — skipping the freshness check is the single biggest saving. [Clear cache](<./32 Clear cache.md>) is how you drop a `never`-cached module when you do finally change it.

## Platform support

|                                      | Desktop | Mobile |
| ------------------------------------ | ------- | ------ |
| **[`require()`][require]**           | ✅      | ✅     |
| **[`requireAsync()`][requireAsync]** | ✅      | ✅     |

[require]: <../02 Core functions.md#require>
[requireAsync]: <../02 Core functions.md#requireasync>
