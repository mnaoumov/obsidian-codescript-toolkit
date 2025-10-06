# Top-level await

|                                       | Desktop | Mobile |
| ------------------------------------- | ------- | ------ |
| **[`require()`][require]           | ❌       | ❌      |
| **[`requireAsync()`][requireAsync] | ✅       | ✅      |

```js
// top-level-await.js
await Promise.resolve(); // top-level await
export const dep = 42;

// script.js
await requireAsync('./top-level-await.js');
```

[require]: ./new-functions.md#require
[requireAsync]: ./new-functions.md#requireasync
