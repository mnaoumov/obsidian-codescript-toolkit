# Top-level await

|                                      | Desktop | Mobile |
| ------------------------------------ | ------- | ------ |
| **[`require()`][require]**           | ❌       | ❌      |
| **[`requireAsync()`][requireAsync]** | ✅       | ✅      |

```js
// topLevelAwait.js
await Promise.resolve(); // top-level await
export const dep = 42;

// script.js
await requireAsync('./topLevelAwait.js');
```

[require]: ./core-functions.md#require
[requireAsync]: ./core-functions.md#requireasync
