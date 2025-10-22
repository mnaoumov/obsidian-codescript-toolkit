# Top-level await

|                                       | Desktop | Mobile |
| ------------------------------------- | ------- | ------ |
| **[`require()`][require]**           | ❌       | ❌      |
| **[`requireAsync()`][requireAsync]** | ✅       | ✅      |

```js
// topLevelAwait.js
await Promise.resolve(); // top-level await
export const dep = 42;

// script.js
await requireAsync('./topLevelAwait.js');
```

[require]: ./new-functions.md#require
[requireAsync]: ./new-functions.md#requireasync
