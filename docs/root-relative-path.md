# Root-relative path

|                                      | Desktop | Mobile |
| ------------------------------------ | ------- | ------ |
| **[`require()`][require]**           | ✅       | ❌      |
| **[`requireAsync()`][requireAsync]** | ✅       | ✅      |

Adds support for root-relative paths:

```js
require('/path/from/root.js');
```

The root `/` folder is configurable via settings.

[require]: ./core-functions.md#require
[requireAsync]: ./core-functions.md#requireasync
