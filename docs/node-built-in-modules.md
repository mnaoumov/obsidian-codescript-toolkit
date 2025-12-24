# Node built-in modules

|                                      | Desktop | Mobile |
| ------------------------------------ | ------- | ------ |
| **[`require()`][require]**           | ✅      | ❌     |
| **[`requireAsync()`][requireAsync]** | ✅      | ❌     |

You can require Node built-in modules such as `fs` with an optional prefix `node:`.

```js
require('fs');
require('node:fs');
```

[require]: ./core-functions.md#require
[requireAsync]: ./core-functions.md#requireasync
